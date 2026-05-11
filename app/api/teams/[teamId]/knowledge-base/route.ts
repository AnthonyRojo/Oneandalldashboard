import { NextRequest } from "next/server";
import {
  getSupabaseAdmin, getAuthUser,
  unauthorized, badRequest, serverError, success,
} from "@/lib/api-helpers";

// GET /api/teams/[teamId]/knowledge-base
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { teamId } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("knowledge_base")
    .select("id, name, file_size, token_estimate, created_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("KB GET error:", error.message);
    return serverError(error.message);
  }
  return success({ files: data ?? [] });
}

// POST /api/teams/[teamId]/knowledge-base
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { teamId } = await params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest("Invalid form data.");
  }

  const file = formData.get("file") as File | null;
  if (!file) return badRequest("No file provided.");
  if (file.type !== "application/pdf") return badRequest("Only PDF files are supported.");

  const MAX_MB = 20;
  if (file.size > MAX_MB * 1024 * 1024) return badRequest(`File must be under ${MAX_MB}MB.`);

  let content: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    // Dynamic import keeps pdf-parse out of module init — safer in serverless
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (
      buf: Buffer
    ) => Promise<{ text: string; numpages: number }>;
    const parsed = await pdfParse(buffer);
    content = parsed.text.trim();
  } catch (err) {
    console.error("PDF parse error:", err);
    return serverError("Failed to extract text from PDF. Make sure the file is not corrupted or image-only.");
  }

  if (!content) {
    return badRequest("No text could be extracted. The PDF may be image-only (scanned). Try a text-based PDF.");
  }

  const tokenEstimate = Math.ceil(content.length / 4);
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("knowledge_base")
    .insert({
      team_id: teamId,
      name: file.name,
      content,
      file_size: file.size,
      token_estimate: tokenEstimate,
      created_by: user.id,
    })
    .select("id, name, file_size, token_estimate, created_at")
    .single();

  if (error) {
    console.error("KB insert error:", error.message);
    return serverError(error.message);
  }
  return success({ file: data });
}
