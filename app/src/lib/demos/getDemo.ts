import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  analysisSchema,
  type AnalysisResult,
} from "@/lib/schema/analysis";

const DEMOS_DIR = path.join(process.cwd(), "src", "data", "demos");
const DEMO_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const demoListingSchema = z.object({
  label: z.string(),
  description: z.string(),
  imageUrls: z.array(z.string()).min(1),
  hint: z.string(),
});

const manifestSchema = z.record(z.string(), demoListingSchema);

export type DemoListing = z.infer<typeof demoListingSchema>;

export type DemoResponse = {
  listing: DemoListing;
  analysis: AnalysisResult;
};

let manifestCache: Record<string, DemoListing> | null = null;

function loadManifest(): Record<string, DemoListing> {
  if (manifestCache) return manifestCache;

  const manifestPath = path.join(DEMOS_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    manifestCache = {};
    return manifestCache;
  }

  const raw = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as unknown;
  manifestCache = manifestSchema.parse(raw);
  return manifestCache;
}

export function isValidDemoId(id: string): boolean {
  return DEMO_ID_PATTERN.test(id);
}

export function listDemoIds(): string[] {
  const manifest = loadManifest();
  return Object.keys(manifest).filter((id) => {
    const analysisPath = path.join(DEMOS_DIR, `${id}.json`);
    return fs.existsSync(analysisPath);
  });
}

export function listDemoSummaries(): Array<DemoListing & { id: string }> {
  const manifest = loadManifest();
  return listDemoIds().map((id) => ({
    id,
    ...manifest[id],
  }));
}

export function loadDemoAnalysis(id: string): AnalysisResult | null {
  if (!isValidDemoId(id)) {
    return null;
  }

  const filePath = path.join(DEMOS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
  return analysisSchema.parse(raw);
}

export function loadDemo(id: string): DemoResponse | null {
  const manifest = loadManifest();
  const listing = manifest[id];
  const analysis = loadDemoAnalysis(id);

  if (!listing || !analysis) {
    return null;
  }

  return { listing, analysis };
}
