import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminDashboardData } from "@/lib/admin/dashboard";
import { getAdminAccess } from "@/lib/auth/admin-access";
import { isSameOrigin } from "@/lib/http";
import { hasSupabaseConfiguration } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  applicationId: z.string().uuid(),
  action: z.enum(["approved", "rejected", "information_requested", "suspended"]),
  notes: z.string().trim().max(2000).optional().default(""),
  expectedVersion: z.number().int().positive(),
});

export async function GET() {
  if (!hasSupabaseConfiguration()) {
    return NextResponse.json({ error: "The administrator service is not configured." }, { status: 503 });
  }

  try {
    const access = await getAdminAccess();
    if (access.status === "signed_out") {
      return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    }
    if (access.status === "forbidden") {
      return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    }
    if (access.status === "mfa_required") {
      return NextResponse.json(
        { error: "Complete administrator MFA to continue.", code: "mfa_required" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      await getAdminDashboardData(access.supabase, access.user.id, access.role),
    );
  } catch (error) {
    console.error("Could not load the administrator applications.", error);
    return NextResponse.json(
      { error: "Could not load administrator applications." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  if (!hasSupabaseConfiguration()) {
    return NextResponse.json({ error: "The administrator service is not configured." }, { status: 503 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "The review request is invalid." }, { status: 400 });
  }

  try {
    const access = await getAdminAccess();
    if (access.status === "signed_out") {
      return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    }
    if (access.status === "forbidden") {
      return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    }
    if (access.status === "mfa_required") {
      return NextResponse.json(
        { error: "Complete administrator MFA to continue.", code: "mfa_required" },
        { status: 403 },
      );
    }

    const { data, error } = await access.supabase.rpc("review_property_application", {
      target_application_id: parsed.data.applicationId,
      decision: parsed.data.action,
      decision_notes: parsed.data.notes,
      expected_version: parsed.data.expectedVersion,
    });

    if (error) {
      const conflictCodes = ["40001", "55000"];
      const clientErrorCodes = ["22023", "23514", "P0002"];
      if (conflictCodes.includes(error.code)) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (clientErrorCodes.includes(error.code)) {
        return NextResponse.json(
          { error: error.message },
          { status: error.code === "P0002" ? 404 : 422 },
        );
      }
      if (error.code === "42501") {
        return NextResponse.json({ error: "Administrator authorization is required." }, { status: 403 });
      }
      console.error("Application review transaction failed.", error);
      return NextResponse.json({ error: "Could not process the application decision." }, { status: 500 });
    }

    return NextResponse.json({ application: data });
  } catch (error) {
    console.error("Could not process the administrator review request.", error);
    return NextResponse.json({ error: "Could not process the application decision." }, { status: 500 });
  }
}
