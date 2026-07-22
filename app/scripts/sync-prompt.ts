/**
 * Upsert the local private system prompt into Supabase (app_config).
 *
 * Usage (from app/):
 *   npm run sync-prompt
 *   npm run sync-prompt -- --dry-run
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const SYSTEM_PROMPT_CONFIG_KEY = "system_prompt";

function resolvePrivatePromptPath(cwd = process.cwd()): string | null {
  const candidates = [
    path.join(cwd, "src", "lib", "prompts", "system.private.txt"),
    path.join(cwd, "app", "src", "lib", "prompts", "system.private.txt"),
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const filePath = resolvePrivatePromptPath(process.cwd());

  if (!filePath) {
    console.error(
      "Missing system.private.txt. Expected at src/lib/prompts/system.private.txt",
    );
    process.exit(1);
  }

  const prompt = fs.readFileSync(filePath, "utf8").trim();
  if (prompt.length < 100) {
    console.error("system.private.txt looks empty or too short.");
    process.exit(1);
  }

  console.log(`Source: ${filePath}`);
  console.log(`Chars:  ${prompt.length}`);

  if (dryRun) {
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

  const { error } = await supabase.from("app_config").upsert(
    {
      key: SYSTEM_PROMPT_CONFIG_KEY,
      value: prompt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) {
    console.error("Supabase upsert failed:", error.message);
    console.error(
      "Did you run supabase/app_config.sql in the Supabase SQL editor?",
    );
    process.exit(1);
  }

  console.log(`✓ Upserted app_config key="${SYSTEM_PROMPT_CONFIG_KEY}"`);
  console.log(
    "Production picks this up within ~60s (cache TTL). No Vercel redeploy needed.",
  );
  console.log(
    "Optional: remove SYSTEM_PROMPT from Vercel so prod always uses Supabase.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
