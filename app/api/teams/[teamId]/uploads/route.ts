import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { getSupabaseAdmin, unauthorized, badRequest, serverError, success } from "@/lib/api-helpers";

// Post cover images for the calendar's Grid view. Stored in a public bucket so
// the <img> tags can load them directly; paths are random so they can't be guessed.
const BUCKET = "post-covers";
const MAX_BYTES = 4 * 1024 * 1024; // Vercel caps request bodies at 4.5MB; the browser shrinks images first
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

// POST /api/teams/[teamId]/uploads  (multipart/form-data, field "file")
export async function POST(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return unauthorized();
  const supabase = getSupabaseAdmin();

  // Verify the token with Supabase (not just decode it) and check team membership.
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user) return unauthorized();
  const { teamId } = await params;
  const { data: member } = await supabase.from("team_members").select("id").eq("team_id", teamId).eq("user_id", auth.user.id).maybeSingle();
  if (!member) return unauthorized();

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return badRequest("No file uploaded");
    const ext = TYPES[file.type];
    if (!ext) return badRequest("Use a JPG, PNG, WebP or GIF image");
    if (file.size > MAX_BYTES) return badRequest("Image is too large (max 4MB)");

    // Create the bucket the first time anyone uploads.
    const { error: bucketError } = await supabase.storage.getBucket(BUCKET);
    if (bucketError) {
      const { error } = await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES, allowedMimeTypes: Object.keys(TYPES) });
      if (error && !/already exists/i.test(error.message)) throw error;
    }

    const path = `${teamId}/${randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, cacheControl: "31536000" });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return success({ url: data.publicUrl });
  } catch (err) {
    console.error("Upload error:", err);
    return serverError("Couldn't upload that image");
  }
}
