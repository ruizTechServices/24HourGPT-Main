import { createClient } from '@/lib/clients/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, );

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.stripe_customer_id) {
    return NextResponse.json({ error: 'Stripe customer not found.' }, { status: 404 });
  }

  const returnUrl = `${req.headers.get('origin')}/`;

  try {
    const { url } = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error creating Stripe customer portal session:', error);
    return NextResponse.json({ error: 'Error creating customer portal session' }, { status: 500 });
  }
}
