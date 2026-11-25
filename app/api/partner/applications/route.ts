import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin } from "@/lib/http";
import { isPublicRegistrationAuthorized } from "@/lib/registration";
import {
  createSupabaseServerClient,
  hasSupabaseConfiguration,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const applicationSchema = z.object({
  business_name: z.string().trim().min(2).max(160),
  trading_name: z.string().trim().max(160).optional(),
  business_email: z.string().trim().email().max(254),
  business_phone: z.string().trim().min(7).max(30),
  property_name: z.string().trim().min(2).max(160),
  category: z.enum([
    "hotel",
    "luxury_hotel",
    "boutique_hotel",
    "resort",
    "guest_house",
    "serviced_apartment",
    "short_let_apartment",
    "lodge",
    "hostel",
    "other",
  ]),
  description: z.string().trim().min(20).max(4000),
  address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  country: z.string().trim().min(2).max(100).default("Nigeria"),
});

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }

  if (process.env.PUBLIC_REGISTRATION_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Public property registration is currently closed." },
      { status: 403 },
    );
  }

  if (!hasSupabaseConfiguration()) {
    return NextResponse.json({ error: "The property service is not configured." }, { status: 503 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = applicationSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the property details." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Could not verify the partner session.", userError);
    return NextResponse.json({ error: "Could not verify the account session." }, { status: 401 });
  }

  if (!user || !user.email_confirmed_at) {
    return NextResponse.json({ error: "Sign in with a verified email first." }, { status: 401 });
  }

  let registrationAuthorized: boolean;
  try {
    registrationAuthorized = await isPublicRegistrationAuthorized(supabase);
  } catch (error) {
    console.error("Could not verify launch authorization for an application.", error);
    return NextResponse.json(
      { error: "Property registration is not ready. Contact StayBridge support." },
      { status: 503 },
    );
  }

  if (!registrationAuthorized) {
    return NextResponse.json(
      { error: "Property registration has not been authorized by both founders." },
      { status: 403 },
    );
  }

  const { data, error } = await supabase.rpc("submit_property_application", {
    payload: parsed.data,
  });

  if (error) {
    console.error("Property application submission failed.", error);
    const status = error.code === "42501" ? 403 : error.code === "54000" ? 429 : 400;
    return NextResponse.json({ error: "Could not submit the property application." }, { status });
  }

  return NextResponse.json(
    {
      applicationId: data.application_id,
      propertyId: data.property_id,
      status: "pending_review",
    },
    { status: 201 },
  );
}
