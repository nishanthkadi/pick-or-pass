import {
  GoogleGenerativeAI,
  type Part,
} from "@google/generative-ai";
import { getSystemPrompt } from "@/lib/prompts/system";
import {
  parseAnalysisResponse,
  type AnalysisResult,
} from "@/lib/schema/analysis";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_MODEL =
  process.env.GEMINI_MODEL ?? "gemini-flash-latest";

function getClient(apiKey?: string) {
  const raw = apiKey ?? process.env.GEMINI_API_KEY;
  const key = raw?.trim().replace(/^["']|["']$/g, "");
  if (!key) {
    throw new Error(
      "Missing GEMINI_API_KEY. Add it to .env.local or pass apiKey for BYOK.",
    );
  }
  return new GoogleGenerativeAI(key);
}

export type InlineImage = {
  data: Buffer;
  mimeType: string;
};

export type AnalyzeListingInput = {
  listingText: string;
  imagePaths?: string[];
  images?: InlineImage[];
  apiKey?: string;
  model?: string;
};

function mimeFromPath(imagePath: string): string {
  const ext = path.extname(imagePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

function bufferToPart(data: Buffer, mimeType: string): Part {
  return {
    inlineData: {
      data: data.toString("base64"),
      mimeType,
    },
  };
}

function pathToPart(imagePath: string): Part {
  return bufferToPart(fs.readFileSync(imagePath), mimeFromPath(imagePath));
}

function resolveImageParts(input: AnalyzeListingInput): Part[] {
  if (input.images?.length) {
    return input.images.map((img) => bufferToPart(img.data, img.mimeType));
  }
  if (input.imagePaths?.length) {
    return input.imagePaths.map(pathToPart);
  }
  return [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getGeminiErrorStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }
  return undefined;
}

function geminiErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? "");
}

/** Daily/minute quota — fail immediately; retries only burn time. */
export function isGeminiQuotaError(error: unknown): boolean {
  const status = getGeminiErrorStatus(error);
  if (status === 429) return true;
  return /quota|rate.?limit|resource.?exhausted|too many requests/i.test(
    geminiErrorMessage(error),
  );
}

/** Transient overload / high demand — safe to retry briefly. */
export function isGeminiBusyError(error: unknown): boolean {
  const status = getGeminiErrorStatus(error);
  if (status === 503) return true;
  return /503|service unavailable|high demand|currently experiencing|try again later/i.test(
    geminiErrorMessage(error),
  );
}

/** Transient backend blips — limited retry only. */
function isTransientGeminiError(error: unknown): boolean {
  return isGeminiBusyError(error);
}

async function generateWithRetry(
  generativeModel: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  request: Parameters<
    ReturnType<GoogleGenerativeAI["getGenerativeModel"]>["generateContent"]
  >[0],
) {
  const maxTransientAttempts = 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxTransientAttempts; attempt++) {
    try {
      return await generativeModel.generateContent(request);
    } catch (error) {
      lastError = error;
      if (isGeminiQuotaError(error)) {
        throw error;
      }
      if (!isTransientGeminiError(error) || attempt === maxTransientAttempts) {
        throw error;
      }
      await sleep(1000 * attempt);
    }
  }

  throw lastError;
}

export async function analyzeListing(
  input: AnalyzeListingInput,
): Promise<AnalysisResult> {
  const { listingText, apiKey, model = DEFAULT_MODEL } = input;
  const imageParts = resolveImageParts(input);

  if (!listingText.trim()) {
    throw new Error("Listing text is required.");
  }
  if (imageParts.length === 0) {
    throw new Error("At least one image is required.");
  }

  const genAI = getClient(apiKey);
  const generativeModel = genAI.getGenerativeModel({
    model,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 4096,
    },
    systemInstruction: await getSystemPrompt(),
  });

  const woodCue = /\b(wood|wooden|natural wood|xylophone|mallet)\b/i.test(
    listingText,
  );
  const woodPaintGate = woodCue
    ? `

WOODEN TOY PAINT GATE (required before grade):
Inspect every mallet head, peg, ball, and rounded grip in the photos.
If any show large bare-wood patches where paint wore off → that is mouthable flaking paint → grade avoid (hard deal-breaker). Do not call the set "good condition." A single missing small piece does not override visible flaking paint.
Include one photo-sourced concern reason naming the worn painted part if flaking is present.`
    : "";

  // Images first so the model scans pixels before reading optimistic seller text.
  const parts: Part[] = [
    ...imageParts,
    {
      text: `Analyze this Facebook Marketplace toy listing for visit-worthiness.

PHOTO SCAN FIRST: stock/retailer chrome; cracks or bright white stress marks in plastic bases/handles/wheels; bare wood showing through paint on mallet heads/pegs/rounded grips (mouthable flaking = Avoid); empty compartments; promo-vs-real mismatches.${woodPaintGate}

STACK:
1) Hard deal-breaker visible OR text vs photo contradiction → avoid (never good, never hedge to not_sure).
2) Else blocking unknown → not_sure: interactive/lights/sounds/motors claimed but not clearly powered-on in photos (painted lanterns do not count), OR multi-room/character playset with only 1–2 vague sentences like "comes with extras" (even if photo looks packed). Never call that "simple." Set text_photo_alignment to insufficient_text when text is that sparse.
3) Else real-photo anchors → good (missing price / confirm pieces = hygiene only).

If text_photo_alignment is "contradicts", grade must be avoid.
If text_photo_alignment is "insufficient_text", grade must not be good.

Required JSON: visit_summary, grade, grade_label, text_photo_alignment, alignment_summary, mismatches (array), reasons, limitations (3–5), seller_questions, seller_message_draft, research_recommended, future_capability_note.

Listing description:
${listingText}`,
    },
  ];

  let lastParseError: unknown;
  for (let parseAttempt = 1; parseAttempt <= 2; parseAttempt++) {
    const result = await generateWithRetry(generativeModel, {
      contents: [{ role: "user", parts }],
    });

    const raw = result.response.text();
    if (!raw) {
      lastParseError = new Error("Empty response from Gemini.");
      continue;
    }

    try {
      return applyListingTextPolicy(parseAnalysisResponse(raw), listingText);
    } catch (error) {
      lastParseError = error;
      if (parseAttempt === 2) break;
      await sleep(500);
    }
  }

  throw lastParseError instanceof Error
    ? lastParseError
    : new Error("Failed to parse Gemini JSON response.");
}

/** Product binds the model often drifts past: sparse complex playset text ≠ Good. */
function applyListingTextPolicy(
  result: AnalysisResult,
  listingText: string,
): AnalysisResult {
  const text = listingText.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const hasPrice = /\$\s*\d/.test(text);
  const complexCue =
    /\b(comes with|extras?|characters?|vehicles?|playset|dollhouse|multi[- ]?room)\b/i.test(
      text,
    );
  const sparseComplex =
    words.length <= 18 &&
    !hasPrice &&
    complexCue &&
    !/\b(condition|like\s*new|brand new|complete set|includes)\b/i.test(text);

  const interactiveCue =
    /\b(lights?|sounds?|motors?|interactive|electronic|battery|batteries|working lights?)\b/i.test(
      text,
    );

  if (sparseComplex && result.grade === "good") {
    return {
      ...result,
      grade: "not_sure",
      grade_label: "Not sure",
      text_photo_alignment: "insufficient_text",
      visit_summary:
        "Don't drive yet — ask the seller about key gaps before committing.",
      alignment_summary:
        "Listing text is too sparse for a complex playset even when the photo looks complete.",
    };
  }

  // Interactive claims without a hard Avoid: never Good on free-tier vision that
  // often hallucinates "lights on" from painted lanterns.
  if (interactiveCue && result.grade === "good") {
    return {
      ...result,
      grade: "not_sure",
      grade_label: "Not sure",
      visit_summary:
        "Don't drive yet — ask the seller about key gaps before committing.",
      alignment_summary:
        typeof result.alignment_summary === "string" && result.alignment_summary.trim()
          ? result.alignment_summary
          : "Interactive features claimed in text still need confirmation before a trip.",
    };
  }

  return result;
}
