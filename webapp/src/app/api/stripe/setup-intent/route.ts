import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { requireAuth } from "@/lib/auth-helpers";
import { queryOne, query } from "@/lib/db";

export async function POST() {
  try {
    let userId: string;
    try {
      userId = await requireAuth();
    } catch {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Get or create Stripe customer
    const profile = await queryOne<{ stripe_customer_id: string | null; email: string | null }>(
      "SELECT stripe_customer_id, email FROM profiles WHERE id = $1",
      [userId]
    );

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || undefined,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;

      // Use UPSERT so that if no profile row exists (e.g. Google OAuth users),
      // a new row is inserted instead of the UPDATE silently doing nothing.
      await query(
        `INSERT INTO profiles (id, email, stripe_customer_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET
           email = COALESCE(EXCLUDED.email, profiles.email),
           stripe_customer_id = EXCLUDED.stripe_customer_id`,
        [userId, profile?.email ?? null, customerId]
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
