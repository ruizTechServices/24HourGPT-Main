import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/clients/supabase/server';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// By default, Next.js consumes the request body, which prevents us from verifying the signature.
// This line disables that behavior for this specific route.
export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable: any) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: Request) {
  const buf = await buffer(req.body);
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Error message: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      // This is where you update your database.
      // A `checkout.session.completed` event will have a `subscription` and `customer` ID.
      // You can use these to update the user's profile in Supabase.
      await supabase
        .from('profiles')
        .update({
          stripe_subscription_id: session.subscription,
          subscription_status: 'active',
        })
        .eq('stripe_customer_id', session.customer);
      break;

    case 'customer.subscription.updated':
      const subscriptionUpdated = event.data.object as Stripe.Subscription;
      await supabase
        .from('profiles')
        .update({
          subscription_status: subscriptionUpdated.status,
        })
        .eq('stripe_subscription_id', subscriptionUpdated.id);
      break;

    case 'customer.subscription.deleted':
      const subscriptionDeleted = event.data.object as Stripe.Subscription;
      // This event is sent when a subscription is canceled.
      await supabase
        .from('profiles')
        .update({
          subscription_status: 'canceled', // or whatever status you use for canceled
        })
        .eq('stripe_subscription_id', subscriptionDeleted.id);
      break;

    default:
      console.warn(`Unhandled event type ${event.type}`);
  }

  return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
}
