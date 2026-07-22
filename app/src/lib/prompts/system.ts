import fs from "node:fs";
import path from "node:path";
import {
  getSupabaseAdminClient,
  SupabaseNotConfiguredError,
} from "@/lib/supabase/server";

export const FUTURE_CAPABILITY_NOTE =
  "We don't verify prices, recalls, or seller history yet — you'll need to check these yourself. A future version of this product will do that research for you.";

/** Public, non-secret summary of the grading approach (safe to show in portfolio). */
export const SYSTEM_PROMPT_PUBLIC_SUMMARY = `Visit-worthiness grader for Marketplace toys (ages 3–10).
Photos are the truth anchor. Decision order: PHOTO SCAN → FIND → STACK → GRADE.
Grades: Avoid (hard deal-breakers), Not sure (blocking unknowns), Good (enough to justify a trip).
Full system prompt is loaded from a private local file or Supabase — not committed.`;

export const SYSTEM_PROMPT_CONFIG_KEY = "system_prompt";

const CACHE_TTL_MS = 60_000;

type PromptCache = {
  value: string;
  fetchedAt: number;
};

let supabasePromptCache: PromptCache | null = null;

function injectFutureNote(prompt: string): string {
  if (prompt.includes("${FUTURE_CAPABILITY_NOTE}")) {
    return prompt.replaceAll("${FUTURE_CAPABILITY_NOTE}", FUTURE_CAPABILITY_NOTE);
  }
  if (prompt.includes(FUTURE_CAPABILITY_NOTE)) {
    return prompt;
  }
  return prompt.replace(
    /future_capability_note: exactly as provided by the product[^\n]*/,
    `future_capability_note: exactly "${FUTURE_CAPABILITY_NOTE}"`,
  );
}

export function resolvePrivatePromptPath(cwd = process.cwd()): string | null {
  const candidates = [
    path.join(cwd, "src", "lib", "prompts", "system.private.txt"),
    path.join(cwd, "app", "src", "lib", "prompts", "system.private.txt"),
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

function loadPrivatePromptFile(): string | null {
  const filePath = resolvePrivatePromptPath();
  if (!filePath) return null;
  return fs.readFileSync(filePath, "utf8").trim();
}

async function loadPromptFromSupabase(): Promise<string | null> {
  const now = Date.now();
  if (
    supabasePromptCache &&
    now - supabasePromptCache.fetchedAt < CACHE_TTL_MS
  ) {
    return supabasePromptCache.value;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", SYSTEM_PROMPT_CONFIG_KEY)
      .maybeSingle();

    if (error) {
      console.error("[system-prompt] Supabase read failed:", error.message);
      return null;
    }

    const value = data?.value?.trim();
    if (!value) return null;

    supabasePromptCache = { value, fetchedAt: now };
    return value;
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return null;
    }
    console.error("[system-prompt] Supabase read error:", err);
    return null;
  }
}

/** Clear in-memory cache (used after sync-prompt). */
export function clearSystemPromptCache(): void {
  supabasePromptCache = null;
}

/**
 * Full system prompt for Gemini.
 * Order: local private file (dev) → Supabase private.app_config → SYSTEM_PROMPT env.
 */
export async function getSystemPrompt(): Promise<string> {
  const fromFile = loadPrivatePromptFile();
  if (fromFile) {
    return injectFutureNote(fromFile);
  }

  const fromSupabase = await loadPromptFromSupabase();
  if (fromSupabase) {
    return injectFutureNote(fromSupabase);
  }

  const fromEnv = process.env.SYSTEM_PROMPT?.trim();
  if (fromEnv) {
    return injectFutureNote(fromEnv);
  }

  throw new Error(
    "System prompt not configured. Create app/src/lib/prompts/system.private.txt, run `npm run sync-prompt` to store it in Supabase, or set SYSTEM_PROMPT as a fallback.",
  );
}

/** @deprecated Prefer getSystemPrompt() — kept for any accidental static imports during migration. */
export const SYSTEM_PROMPT = SYSTEM_PROMPT_PUBLIC_SUMMARY;
