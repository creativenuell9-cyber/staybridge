import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin } from "@/lib/http";
import { hasSupabaseConfiguration, createSupabaseServerClient } from "@/lib/supabase/server";
import { isPublicRegistrationAuthorized } from "@/lib/registration";

const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
});

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }

  if (process.env.PUBLIC_REGISTRATION_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Public registration is currently closed." },
      { status: 403 },
    );
  }

  if (!hasSupabaseConfiguration()) {
    return NextResponse.json({ error: "Server authentication is not configured." }, { status: 503 });
  }

  const parsedBody = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(parsedBody);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your account details." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  let registrationAuthorized: boolean;

  try {
    registrationAuthorized = await isPublicRegistrationAuthorized(supabase);
  } catch (error) {
    console.error("Could not verify launch authorization for account creation.", error);
    return NextResponse.json(
      { error: "Public registration is not ready. Contact StayBridge support." },
      { status: 503 },
    );
  }

  if (!registrationAuthorized) {
    return NextResponse.json(
      { error: "Public registration has not been authorized by both founders." },
      { status: 403 },
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
    },
  });

  if (error) {
    console.error("Supabase account creation failed.", error);
    return NextResponse.json({ error: "Could not create the account." }, { status: 400 });
  }

  return NextResponse.json(
    {
      authenticated: Boolean(data.session),
      message: data.session
        ? "Account created. Continue with your property application."
        : "If the address is eligible, a verification email will arrive shortly.",
    },
    { status: data.session ? 201 : 202 },
  );
}
