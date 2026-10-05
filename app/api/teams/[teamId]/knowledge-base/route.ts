import { NextRequest } from "next/server";
import {
  getSupabaseAdmin, requireTeamMember,
  unauthorized, badRequest, serverError, success,
} from "@/lib/api-helpers";

// GET /api/teams/[teamId]/knowledge-base
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireTeamMember(request, params);
  if (auth instanceof Response) return auth;
  const { user } = auth;

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
  const auth = await requireTeamMember(request, params);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const { teamId } = await params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest("Invalid form data.");
  }

  const file = formData.get("file") as File | null;
  if (!file) return badRequest("No file provided.");

  const ALLOWED_TYPES = [
    "application/pdf",
    "text/plain",
    "text/markdown",
    "text/x-markdown",
  ];
  const isText = file.type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".txt");
  const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
  if (!isText && !isPdf) return badRequest("Supported formats: PDF, Markdown (.md), or plain text (.txt).");

  const MAX_MB = 20;
  if (file.size > MAX_MB * 1024 * 1024) return badRequest(`File must be under ${MAX_MB}MB.`);

  let content: string;
  if (isText) {
    content = (await file.text()).trim();
    if (!content) return badRequest("File appears to be empty.");
  } else {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (
        buf: Buffer
      ) => Promise<{ text: string; numpages: number }>;
      const parsed = await pdfParse(buffer);
      content = parsed.text.trim();
    } catch (err) {
      console.error("PDF parse error:", err);
      return serverError("Failed to extract text from PDF. If it's a scanned/image PDF, export it as .md or .txt instead.");
    }
    if (!content) return badRequest("No text could be extracted. The PDF may be image-only. Try uploading as .md or .txt.");
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
