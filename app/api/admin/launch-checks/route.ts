import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminAccess } from "@/lib/auth/admin-access";
import { isSameOrigin } from "@/lib/http";
import { hasSupabaseConfiguration } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const launchCheckSchema = z.object({
  checkKey: z.string().trim().min(1).max(100),
  passed: z.boolean(),
  evidence: z.string().trim().max(4000).optional().default(""),
});

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  if (!hasSupabaseConfiguration()) {
    return NextResponse.json({ error: "The administrator service is not configured." }, { status: 503 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = launchCheckSchema.safeParse(payload);
  if (!parsed.success || (parsed.data.passed && parsed.data.evidence.length < 10)) {
    return NextResponse.json(
      { error: "Provide valid check details and at least 10 characters of evidence when passing." },
      { status: 400 },
    );
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
    if (access.role !== "super_administrator") {
      return NextResponse.json(
        { error: "Only a super-administrator can update launch security checks." },
        { status: 403 },
      );
    }

    const { data, error } = await access.supabase
      .from("launch_security_checks")
      .update({
        passed: parsed.data.passed,
        evidence: parsed.data.passed ? parsed.data.evidence : null,
      })
      .eq("check_key", parsed.data.checkKey)
      .select("check_key")
      .maybeSingle();

    if (error) {
      console.error("Could not update the launch security check.", error);
      return NextResponse.json({ error: "Could not update this security check." }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Launch security check not found." }, { status: 404 });
    }

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Could not process the launch security check update.", error);
    return NextResponse.json({ error: "Could not update this security check." }, { status: 500 });
  }
}
