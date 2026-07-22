import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  analysisSchema,
  type AnalysisResult,
} from "@/lib/schema/analysis";
import {
  getSupabaseAdminClient,
  SupabaseNotConfiguredError,
} from "@/lib/supabase/server";

const DEMOS_DIR = path.join(process.cwd(), "src", "data", "demos");
const DEMO_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CACHE_TTL_MS = 60_000;

const demoListingSchema = z.object({
  label: z.string(),
  description: z.string(),
  imageUrls: z.array(z.string()).min(1),
  hint: z.string().optional(),
});

const manifestSchema = z.record(z.string(), demoListingSchema);

export type DemoListing = z.infer<typeof demoListingSchema>;

export type DemoResponse = {
  listing: DemoListing;
  analysis: AnalysisResult;
};

export type DemoSummary = DemoListing & { id: string };

type DemoCache = {
  summaries: DemoSummary[];
  byId: Record<string, DemoResponse>;
  fetchedAt: number;
};

let supabaseDemoCache: DemoCache | null = null;
let localManifestCache: Record<string, DemoListing> | null = null;

function loadLocalManifest(): Record<string, DemoListing> {
  if (localManifestCache) return localManifestCache;

  const candidates = [
    path.join(DEMOS_DIR, "manifest.local.json"),
    path.join(DEMOS_DIR, "manifest.json"),
  ];

  for (const manifestPath of candidates) {
    if (!fs.existsSync(manifestPath)) continue;
    const raw = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as unknown;
    localManifestCache = manifestSchema.parse(raw);
    return localManifestCache;
  }

  localManifestCache = {};
  return localManifestCache;
}

export function isValidDemoId(id: string): boolean {
  return DEMO_ID_PATTERN.test(id);
}

function loadLocalDemoAnalysis(id: string): AnalysisResult | null {
  if (!isValidDemoId(id)) return null;
  const filePath = path.join(DEMOS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
  return analysisSchema.parse(raw);
}

function listLocalDemoSummaries(): DemoSummary[] {
  const manifest = loadLocalManifest();
  return Object.keys(manifest)
    .filter((id) => fs.existsSync(path.join(DEMOS_DIR, `${id}.json`)))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((id) => ({ id, ...manifest[id] }));
}

function loadLocalDemo(id: string): DemoResponse | null {
  const manifest = loadLocalManifest();
  const listing = manifest[id];
  const analysis = loadLocalDemoAnalysis(id);
  if (!listing || !analysis) return null;
  return { listing, analysis };
}

async function loadDemosFromSupabase(): Promise<DemoCache | null> {
  const now = Date.now();
  if (supabaseDemoCache && now - supabaseDemoCache.fetchedAt < CACHE_TTL_MS) {
    return supabaseDemoCache;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("demo_listings")
      .select("id,label,description,image_urls,analysis,sort_order")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[demos] Supabase read failed:", error.message);
      return null;
    }

    if (!data?.length) return null;

    const byId: Record<string, DemoResponse> = {};
    const summaries: DemoSummary[] = [];

    for (const row of data) {
      const analysis = analysisSchema.parse(row.analysis);
      const listing: DemoListing = {
        label: row.label,
        description: row.description,
        imageUrls: row.image_urls,
      };
      byId[row.id] = { listing, analysis };
      summaries.push({ id: row.id, ...listing });
    }

    supabaseDemoCache = { summaries, byId, fetchedAt: now };
    return supabaseDemoCache;
  } catch (err) {
    if (!(err instanceof SupabaseNotConfiguredError)) {
      console.error("[demos] Supabase read error:", err);
    }
    return null;
  }
}

export function clearDemoCache(): void {
  supabaseDemoCache = null;
  localManifestCache = null;
}

/** Prefer Supabase catalog; fall back to local demo files. */
export async function listDemoSummaries(): Promise<DemoSummary[]> {
  const remote = await loadDemosFromSupabase();
  if (remote?.summaries.length) return remote.summaries;
  return listLocalDemoSummaries();
}

export async function listDemoIds(): Promise<string[]> {
  const summaries = await listDemoSummaries();
  return summaries.map((d) => d.id);
}

export async function loadDemo(id: string): Promise<DemoResponse | null> {
  if (!isValidDemoId(id)) return null;

  const remote = await loadDemosFromSupabase();
  if (remote?.byId[id]) return remote.byId[id];

  return loadLocalDemo(id);
}
