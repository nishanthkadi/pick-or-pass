import {
  GoogleGenerativeAI,
  type Part,
} from "@google/generative-ai";
import { SYSTEM_PROMPT } from "@/lib/prompts/system";
import {
  parseAnalysisResponse,
  type AnalysisResult,
} from "@/lib/schema/analysis";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_MODEL =
  process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";

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

function isRetryableGeminiError(error: unknown): boolean {
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
      ? (error as { status: number }).status
      : undefined;
  return status === 503 || status === 429;
}

async function generateWithRetry(
  generativeModel: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  request: Parameters<
    ReturnType<GoogleGenerativeAI["getGenerativeModel"]>["generateContent"]
  >[0],
) {
  const maxAttempts = 4;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await generativeModel.generateContent(request);
    } catch (error) {
      lastError = error;
      if (!isRetryableGeminiError(error) || attempt === maxAttempts) {
        throw error;
      }
      await sleep(1500 * attempt);
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
      temperature: 0.2,
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  const parts: Part[] = [
    {
      text: `Analyze this Facebook Marketplace toy listing for visit-worthiness.

Inspect photos closely for cracks, stress marks, chipped or flaking paint on wooden toys, stock/retail screenshots, missing parts, and promo-vs-real mismatches before choosing the grade. If damage or stock-image red flags are visible, do not hedge with Not sure.

Listing description:
${listingText}`,
    },
    ...imageParts,
  ];

  const result = await generateWithRetry(generativeModel, {
    contents: [{ role: "user", parts }],
  });

  const raw = result.response.text();
  if (!raw) {
    throw new Error("Empty response from Gemini.");
  }

  return parseAnalysisResponse(raw);
}
