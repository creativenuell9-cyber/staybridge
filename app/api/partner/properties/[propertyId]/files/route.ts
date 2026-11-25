import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin } from "@/lib/http";
import { createSupabaseServerClient, hasSupabaseConfiguration } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const photoCategories = new Set([
  "exterior",
  "reception",
  "bedroom",
  "bathroom",
  "restaurant",
  "pool",
  "facility",
  "other",
]);
const documentCategories = new Set([
  "business_registration",
  "business_identity",
  "hospitality_permit",
  "representative_authority",
  "other",
]);

function matchesFileSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }
  if (mimeType === "image/webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  if (mimeType === "application/pdf") {
    return String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  }
  return false;
}

function getExtension(mimeType: string) {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };
  return extensions[mimeType];
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ propertyId: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }

  if (!hasSupabaseConfiguration()) {
    return NextResponse.json({ error: "The upload service is not configured." }, { status: 503 });
  }

  const { propertyId } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(propertyId)) {
    return NextResponse.json({ error: "Invalid property identifier." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Could not verify the upload session.", userError);
    return NextResponse.json({ error: "Could not verify the account session." }, { status: 401 });
  }
  if (!user || !user.email_confirmed_at) {
    return NextResponse.json({ error: "Sign in with a verified email first." }, { status: 401 });
  }

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, organization_id")
    .eq("id", propertyId)
    .maybeSingle();

  if (propertyError) {
    console.error("Could not verify property upload access.", propertyError);
    return NextResponse.json({ error: "Could not verify property access." }, { status: 500 });
  }
  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = formData.get("kind");
  const category = formData.get("category");
  const altText = formData.get("altText");

  if (!(file instanceof File) || typeof category !== "string" || typeof kind !== "string") {
    return NextResponse.json({ error: "Choose a file and file category." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Files must be between 1 byte and 10 MB." }, { status: 413 });
  }

  const allowedCategory =
    kind === "photo"
      ? photoCategories.has(category)
      : kind === "document"
        ? documentCategories.has(category)
        : false;
  const allowedMimeType =
    kind === "photo"
      ? ["image/jpeg", "image/png", "image/webp"].includes(file.type)
      : kind === "document"
        ? ["application/pdf", "image/jpeg", "image/png"].includes(file.type)
        : false;

  if (!allowedCategory || !allowedMimeType) {
    return NextResponse.json({ error: "This file type or category is not supported." }, { status: 415 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesFileSignature(bytes, file.type)) {
    return NextResponse.json({ error: "The file content does not match its declared type." }, { status: 415 });
  }

  const bucket = kind === "photo" ? "property-photos" : "business-documents";
  const path = `${property.organization_id}/${property.id}/${randomUUID()}.${getExtension(file.type)}`;
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    console.error("Property file upload failed.", uploadError);
    return NextResponse.json({ error: "Could not upload this file." }, { status: 400 });
  }

  const { data: uploadId, error: recordError } = await supabase.rpc("record_property_upload", {
    target_property_id: property.id,
    target_storage_path: path,
    target_bucket: bucket,
    upload_category: category,
    upload_alt_text: typeof altText === "string" ? altText.slice(0, 240) : "",
  });

  if (recordError) {
    const { error: cleanupError } = await supabase.storage.from(bucket).remove([path]);
    console.error("Could not record uploaded property file.", recordError);
    if (cleanupError) {
      console.error("Could not remove an unrecorded property file.", cleanupError);
    }
    return NextResponse.json({ error: "Could not attach the uploaded file to the property." }, { status: 400 });
  }

  return NextResponse.json({ uploadId }, { status: 201 });
}
