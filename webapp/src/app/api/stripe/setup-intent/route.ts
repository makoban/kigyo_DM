import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || profile?.email || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Use UPSERT so that if no profile row exists (e.g. Google OAuth users),
      // a new row is inserted instead of the UPDATE silently doing nothing.
      await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email || profile?.email || null,
            stripe_customer_id: customerId,
          },
          { onConflict: "id" }
        );
    }

    // Create SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
