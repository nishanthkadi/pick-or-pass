import { apiError } from "@/lib/api/errors";
import { listDemoSummaries } from "@/lib/demos/getDemo";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const demos = await listDemoSummaries();
    return NextResponse.json({
      demos: demos.map((d) => ({
        id: d.id,
        label: d.label,
        description: d.description,
        imageUrl: d.imageUrls[0],
        photoCount: d.imageUrls.length,
      })),
    });
  } catch (err) {
    console.error("[api/demos]", err);
    return apiError(500, "SERVER_MISCONFIGURED", "Could not load sample listings.");
  }
}
