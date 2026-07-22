/**
 * Upload local sample demos (manifest + JSON + public/listings images) to Supabase.
 *
 * Usage (from app/):
 *   npm run sync-demos
 *   npm run sync-demos -- --dry-run
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const BUCKET =
  process.env.SUPABASE_DEMO_LISTINGS_BUCKET?.trim() || "demo-listings";

type ManifestEntry = {
  label: string;
  description: string;
  imageUrls: string[];
};

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

function resolveManifestPath(demosDir: string): string {
  const local = path.join(demosDir, "manifest.local.json");
  const committed = path.join(demosDir, "manifest.json");
  if (fs.existsSync(local)) return local;
  if (fs.existsSync(committed)) return committed;
  throw new Error("Missing manifest.local.json or manifest.json");
}

function publicPathToDisk(
  projectAppRoot: string,
  imageUrl: string,
): string | null {
  if (!imageUrl.startsWith("/")) return null;
  const rel = imageUrl.replace(/^\//, "");
  const disk = path.join(projectAppRoot, "public", rel);
  return fs.existsSync(disk) ? disk : null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const appRoot = process.cwd();
  const demosDir = path.join(appRoot, "src", "data", "demos");
  const manifestPath = resolveManifestPath(demosDir);
  const rawManifest = fs
    .readFileSync(manifestPath, "utf8")
    .replace(/^\uFEFF/, "");
  const manifest = JSON.parse(rawManifest) as Record<string, ManifestEntry>;

  const ids = Object.keys(manifest).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

  console.log(`Manifest: ${manifestPath}`);
  console.log(`Demos:    ${ids.join(", ")}`);

  if (dryRun) {
    for (const id of ids) {
      const analysisPath = path.join(demosDir, `${id}.json`);
      const images = manifest[id].imageUrls.map((u) =>
        publicPathToDisk(appRoot, u),
      );
      console.log(
        `  ${id}: analysis=${fs.existsSync(analysisPath)} images=${images.filter(Boolean).length}/${manifest[id].imageUrls.length}`,
      );
    }
    console.log("Dry run — not writing to Supabase.");
    return;
  }

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error: bucketError } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 8 * 1024 * 1024,
    });
    if (bucketError) {
      console.error(
        `Could not create bucket "${BUCKET}": ${bucketError.message}`,
      );
      console.error(
        "Create a public Storage bucket named demo-listings in the Supabase dashboard, then retry.",
      );
      process.exit(1);
    }
    console.log(`Created public bucket: ${BUCKET}`);
  }

  let upserted = 0;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const entry = manifest[id];
    const analysisPath = path.join(demosDir, `${id}.json`);
    if (!fs.existsSync(analysisPath)) {
      console.error(`Skip ${id}: missing ${analysisPath}`);
      continue;
    }
    const analysis = JSON.parse(fs.readFileSync(analysisPath, "utf8"));

    const publicUrls: string[] = [];
    for (const imageUrl of entry.imageUrls) {
      const diskPath = publicPathToDisk(appRoot, imageUrl);
      if (!diskPath) {
        console.error(`Skip image for ${id}: not found on disk (${imageUrl})`);
        continue;
      }
      const filename = path.basename(diskPath);
      const storagePath = `${id}/${filename}`;
      const bytes = fs.readFileSync(diskPath);
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, bytes, {
          contentType: contentTypeFor(diskPath),
          upsert: true,
        });
      if (uploadError) {
        console.error(`Upload failed ${storagePath}: ${uploadError.message}`);
        process.exit(1);
      }
      const { data: pub } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);
      publicUrls.push(pub.publicUrl);
    }

    if (publicUrls.length === 0) {
      console.error(`Skip ${id}: no images uploaded`);
      continue;
    }

    const { error } = await supabase.from("demo_listings").upsert(
      {
        id,
        label: entry.label,
        description: entry.description,
        sort_order: i + 1,
        image_urls: publicUrls,
        analysis,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) {
      console.error(`Upsert failed for ${id}: ${error.message}`);
      console.error("Did you run supabase/demos.sql in the SQL editor?");
      process.exit(1);
    }

    console.log(`✓ ${id} (${publicUrls.length} image(s))`);
    upserted += 1;
  }

  console.log(`Done. Upserted ${upserted} demo(s) to demo_listings.`);
  console.log("Live app picks these up within ~60s (cache TTL).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
