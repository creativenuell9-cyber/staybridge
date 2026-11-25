import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminAccess } from "@/lib/auth/admin-access";
import { isSameOrigin } from "@/lib/http";
import { hasSupabaseConfiguration } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const approvalSchema = z.object({
  approved: z.boolean(),
  notes: z.string().trim().max(2000).optional().default(""),
});

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  if (!hasSupabaseConfiguration()) {
    return NextResponse.json({ error: "The administrator service is not configured." }, { status: 503 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = approvalSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "The launch approval request is invalid." }, { status: 400 });
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

    const { error } = await access.supabase.rpc("record_founder_launch_approval", {
      is_approved: parsed.data.approved,
      approval_notes: parsed.data.notes,
    });

    if (error) {
      if (error.code === "42501") {
        return NextResponse.json(
          { error: "Only a pre-authorized founder with MFA may record this approval." },
          { status: 403 },
        );
      }
      console.error("Could not record the founder launch approval.", error);
      return NextResponse.json({ error: "Could not record the launch approval." }, { status: 500 });
    }

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Could not process the founder launch approval.", error);
    return NextResponse.json({ error: "Could not record the launch approval." }, { status: 500 });
  }
}
