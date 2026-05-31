import { apiError } from "@/lib/api/errors";
import { listDemoIds, loadDemo } from "@/lib/demos/getDemo";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const demo = loadDemo(id);

  if (!demo) {
    return apiError(404, "NOT_FOUND", `Demo not found: ${id}`, {
      available: listDemoIds(),
    });
  }

  return NextResponse.json(demo);
}
