# Project Audit and Integration Plan

## Current Project Overview and Audit Summary

Your Next.js 15 application (App Router) is well-structured but incomplete in key areas. It uses **Supabase Auth** for user authentication (via `useSupabaseSession` and Supabase SSR client) and includes UI components (Tailwind + ShadCN). Several AI provider clients are scaffolded (OpenAI, Anthropic, etc.), and minimal API routes exist for chat context and embeddings. However, **Ada’s audit** identified critical gaps that must be addressed before launch:

* **Authentication**: Supabase Auth is partially integrated but missing a global Next.js `middleware.ts` to enforce auth and sync sessions. No NextAuth or Prisma setup is present (Supabase serves as both auth and database).
* **Payments**: No payment or subscription implementation exists yet. The `.env` contained Square API keys (with `SQUARE_PLAN_ID` blank), but **no Square code is present** – indicating the subscription flow was not implemented at all. Gio is pivoting to using **Stripe** for payments.Gio is **NOT** using **Square** for payments.
* **Data Persistence**: The chat **context API writes to local files** (JSONL in `data/`), which works in development but will fail on Vercel’s serverless platform (ephemeral file system). **This needs migrating to persistent storage (Supabase DB or Storage).**
* **Embedding & Vector Search**: The embedding route (`app/api/embed`) references a missing function file, and Pinecone upsert logic is likely missing as well. Tests in `tests/` reference these functions, but the implementations are absent. Gio wants to combine `app/api/embed/route.ts`, `components/app/special_components/embedInput.tsx`, & `components/app/chatbot_basic/input_embedder.tsx` accordingly, making sure to adhere to separation of concerns and modularity.
* **Security**: Sensitive API keys are in `.env` (they are not checked into the repo). User data (`users_rows.json`) with PII is present. This poses **severe security risks** if not handled properly – secrets should be rotated and stored securely, and user data should not be in the repo. Gio wants to create a component that handles the PII of the users and stores in Supabase DB and encrypts the data. GIo needs encryption for data in rest and data in transit. He needs a server side component that is capable of this. 

Ada’s audit effectively maps out what’s in place, what’s missing, and recommended next steps. **In summary, the project’s foundation is solid, but key features (auth enforcement, subscription payments, persistent storage, and some AI utilities) are incomplete or unsecure.** We will need to implement these before the application can be safely deployed.

## Decision: Use Supabase Auth and Stripe for Payments

Gio has decided to **continue with Supabase Auth** (avoiding NextAuth unless absolutely necessary) and to **switch the payment system to Stripe** (dropping the earlier Square plan). This decision aligns with ease of integration and security:

* **Supabase Auth** will remain the authentication provider. We’ll fully implement it (adding the missing middleware for session handling and route protection) rather than introducing NextAuth, since the codebase is already using Supabase and you prefer to stick with it.
* **Stripe** will handle all payments and subscriptions. Stripe is a well-supported, secure payment processor, and it integrates nicely with Next.js and Supabase. Importantly, **Stripe’s security** means **we will not store any credit card data** in our database – all sensitive payment info stays within Stripe’s PCI-compliant systems. Our job is to use Stripe’s APIs to create subscriptions and then record the results (like customer and subscription status) in Supabase.

Switching to Stripe from Square means we will ignore the Square env vars and implement a new flow using Stripe’s APIs. The good news: Stripe + Supabase is a common stack (even the Vercel SaaS starter kit uses this combo), so we can follow best practices for a **secure, smooth integration**, but do not use starter kits or templates as they are not secure and not scalable. Everything will be made from scractch.

## Gaps and Required Implementations

Based on the audit and the Stripe decision, here are the key gaps to fill and tasks to implement:

* **Supabase Auth Middleware**: Create a `middleware.ts` at the project root to call `updateSession()` (from `lib/clients/supabase/middleware.ts`) on every request. This will sync the Supabase session cookie for SSR and protect routes. We should configure `matcher` in the middleware to protect any pages that require auth (e.g. all `/app/**` except public pages like the landing page). Ensure that unauthorized users are redirected (the audit noted a redirect to `/login`, but since no `/login` route exists, we will create the login page and implement it accordingly).
* **Stripe Subscription Flow (Pro plan)**: Implement the **Stripe payment workflow** for upgrading users to a “Pro” subscription:

  * **Environment Setup**: Add Stripe configuration to the project. This includes a **Stripe Secret Key**, **Stripe Publishable Key**, and a **Stripe Webhook Signing Secret** (for verifying events). These will be stored as env vars (e.g. `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`) and **never exposed in the repo** or client code (publishable key can be used on client, but secret and webhook secret must remain server-only).
  * **Creating a Checkout Session**: On the frontend, provide an upgrade button that calls a Next.js API route (e.g. `POST /api/stripe/create-checkout-session`). In that API handler, use the Stripe SDK to create a **Checkout Session** for a subscription:

    * Define a **Stripe Product and Price** in your Stripe Dashboard for the Pro plan (if not done already). You’ll get a Price ID (for example, `price_12345`).
    * In the API route, create a checkout session with mode = `"subscription"` and the Price ID for the plan. Associate the session with the authenticated user’s Stripe Customer ID. If the user doesn’t have a Stripe customer yet, create one on the fly (using their Supabase-auth email) before creating the session.
    * The session creation will return a URL (for redirect) or a session ID. We can either redirect the user to the URL or use Stripe.js on the client to redirect to checkout using the session ID. Using the URL in a `Redirect` response is simplest.
    * **Security**: Ensure the API route verifies the user’s identity (e.g., require a Supabase session JWT or user ID in the request) so that only logged-in users can create a checkout for themselves. Use the Supabase **Service Role** key on the server to safely read/update the DB if needed (since it’s a serverless function, we can include `SUPABASE_SERVICE_ROLE_KEY` in env for admin privileges to update any table on webhooks, see below).
  * **Webhook Endpoint**: Implement a Stripe webhook handler at e.g. `POST /api/stripe/webhook` (or `/api/webhooks` as in some examples). This is critical for security and accuracy. Stripe will send events (subscription created, payment succeeded, invoice paid, subscription canceled, etc.) to this endpoint:

    * In the webhook handler, **verify the Stripe signature** using the `STRIPE_WEBHOOK_SECRET`. This means reading the raw request body, because Stripe’s signature check needs the exact payload. (In Next.js API Routes, we will need to disable body parsing or use `req.rawBody` – by default, Next may parse JSON and thus alter the payload. Stripe’s library can verify with the raw text. The Supabase docs also highlight using the raw body for verification.) If verification fails, reject the request with 400.
    * Parse the event types we care about. For a simple subscription model, we’ll handle:

      * `checkout.session.completed` – indicates the user successfully checked out. We can retrieve the session, get the subscription ID and customer ID from it.
      * `customer.created` or `customer.updated` – not critical if we handle customers manually.
      * `invoice.payment_succeeded` – confirms a recurring payment.
      * `customer.subscription.updated` or `subscription.updated` – to catch cancellations or plan changes.
      * `customer.subscription.deleted` – if a subscription is canceled.
    * **Update Supabase**: Using the Supabase server client (with service role), update the user’s record in the database based on the webhook:

      * If a subscription became active (e.g., on `checkout.session.completed` with a subscription), mark the user as **subscribed** in our system. For example, update their profile row with `is_subscribed = true`, store the `stripe_subscription_id`, set a subscription status and current period end date if provided. (We might also store `stripe_customer_id` if not already saved.)
      * If a subscription is canceled or expires, update the user profile (e.g., set `is_subscribed = false` or update status to canceled).
    * By relying on the webhook, we ensure the source of truth is Stripe’s event (which is secure) rather than client-side signals. This way a user can’t cheat by faking a response – we only trust Stripe’s backend events.
    * **Note**: We must return a 200 response to Stripe quickly to avoid repeated retries. Perform minimal work in the handler (just verify, parse, update DB). Any heavy logic should be done asynchronously or in the DB via triggers if needed.
  * **Frontend Post-Checkout**: After the Stripe Checkout completes, Stripe can redirect the user back to a specified URL (we’ll set a `success_url` and `cancel_url` when creating the session). For example, on success we could redirect to `/pro/success` page. On that page, we can simply inform the user the upgrade was successful and maybe re-fetch their profile from Supabase to confirm the new status. In practice, the webhook will likely have updated the DB by this time. We should also handle the `cancel_url` (if user abandons payment).
* **Supabase DB Schema for Subscription**: We need to decide how to store subscription info. Given the scale, **using the existing `profiles` table is likely sufficient**:

  * Add fields to the `profiles` (or equivalent user meta table) such as:

    * `stripe_customer_id` (Text)
    * `stripe_subscription_id` (Text)
    * `subscription_status` (Text, e.g. active, canceled, trialing, etc.) – or a simple boolean `is_subscribed` if we only care about active/inactive.
    * Possibly `current_period_end` (Timestamp) if we want to track expiry for display or to know when to expire access (Stripe also sends `subscription.updated` events on renewal or cancellation with such info).
    * If you plan multiple plans (e.g. different tiers), a field for `plan` or `stripe_price_id` could be stored too. For now, if it’s just a single Pro plan, this might not be necessary beyond a boolean or status.
  * The **profiles table approach** is straightforward: each user has one row that we update. This works since each user in this app can only have one subscription (the “Pro” plan). If in the future you allow multiple subscriptions or want a history of changes, a separate `subscriptions` table would be more appropriate. For now, sticking to profiles keeps it simple.
  * Ensure the Supabase policy (Row Level Security, if enabled) allows the server (using service role) to update profiles on the user’s behalf when webhooks come in. Typically, using the service role bypasses RLS, but we must use that securely (never expose the service key to the client, only use it in server environment).
* **Embedding Function**: Create the missing `lib/functions/openai/embeddings.ts` (or the correct path) with a function `getTextEmbedding(text: string): Promise<number[]>`. This function will use the OpenAI API (via the OpenAI client you have in `lib/clients/openai/client.ts`) to generate embeddings. The `app/api/embed/route.ts` can then call this and return the result. Make sure to handle errors (e.g., API failures) gracefully in this route. With this in place, the embedding route will work instead of throwing an import error.
* **Pinecone Upsert Implementation**: Ensure that `lib/functions/pinecone/upsertVectors.ts` exists and has an `indexDocument` or `upsertVectors` function as expected. This should take content (and perhaps an ID) and upsert it into your Pinecone index via the Pinecone client. If this file is missing, create it using the Pinecone JavaScript client (`pinecone-ts-client` or similar, configured with your PINECONE\_API\_KEY and index name). The test script `tests/testUpsert.ts` should pass once this is implemented. Again, handle errors carefully.
* **Replace File System Storage for Chat Logs**: The current context API writes chat history to `.jsonl` files in the `data/` directory. This won’t work on Vercel – the file system there is **ephemeral and read-only** for deployed functions (any writes disappear after execution). To avoid data loss and crashes in production, move this to Supabase:

  * **Option 1: Supabase Database** – Create a table (e.g., `chat_messages` or `contexts`) with columns for `user_id` (references auth.users), `role` (user/assistant), `content` (text), `created_at`, etc., or a single column for the combined JSONL content if you prefer storing the whole conversation as one text blob. It might be better to store each message as a row for flexibility. The API route `/api/context` can then **write to the DB** (using Supabase client) instead of writing to disk. You can fetch the conversation from DB when needed. This approach makes the data persistent and queryable (e.g., you could show history to users in the future).
  * **Option 2: Supabase Storage** – Supabase offers an S3-like object storage. You could save the conversation JSONL file to a storage bucket. This would more directly mimic the current file approach (one file per conversation or per user). However, given you already have a database and the data is text-based, using the DB is likely simpler.
  * Whichever approach, ensure proper security: only allow the authorized user (or server) to access their chat history. With a DB table, use RLS policies to enforce user-id matching (so users can only read their own history). With Storage, use bucket policies or signed URLs. Considering you already have to update profiles via the service key, using the DB for chat logs is consistent.
  * Also update the `/api/context/download` route to pull from the new source (DB or storage) and return the data as a download (if that route is meant for users to download their chat history). If using DB, you might assemble the JSONL on the fly from the rows.
* **Dependency and Config Fixes**:

  * Add `@supabase/supabase-js` to your project dependencies. The code imports types from it (like `Session`), and although Supabase auth is working through SSR helpers, having the library ensures type safety and possibly needed functionality (e.g., if you want to use Supabase client in API routes for DB operations).
  * Add the Stripe Node library: `stripe` (for server) and perhaps `@stripe/stripe-js` for the client if using Stripe.js to redirect to Checkout or to use Elements.
  * Remove any Square SDK dependencies or Square env vars from the project if they were added (seems they were not implemented in code, only in env). We will use Stripe exclusively.
  * Double-check the versions of packages and update if needed (Stripe’s API changes over time; use the latest Stripe SDK and set `apiVersion` if required to a specific stable version).
  * Fill in `next.config.js` if any custom config is needed (likely not much; just ensure `reactStrictMode` and such are fine).
  * Create a script or add to `package.json` a **test** script to run those TS test files (maybe using `tsx`). While not critical for functionality, having a way to run `npm run test` to execute the files in `tests/` will help catch regressions (for example, after implementing embedding and pinecone, `testEmbeddings.ts` and `testUpsert.ts` should run without errors).
* **Operational and Security Hardening**:

  * **Secrets Management**: Immediately ensure no secrets are in the Git repo. Move them to environment variables outside version control (Vercel’s dashboard for production, and a local `.env.local` for development). Rotate any keys that were exposed in the repo’s history (OpenAI keys, etc.) – assume they are compromised. This includes Supabase keys, API keys, and the old Square keys. Add the new Stripe keys securely. In short, **no plaintext secrets should be committed**.
  * **Profiles Data**: The `users_rows.json` file containing PII should be removed from the repository. If it’s sample data, keep it out of git; if it’s real user export, definitely keep it private. Use Supabase’s admin UI or a secure migration to manage initial data.
  * **Secure Stripe Integration**: As noted, do not store any credit card data in Supabase. Use HTTPS for all Stripe webhooks (Vercel provides HTTPS by default). Verify webhook signatures to prevent fake requests. Use Stripe’s test mode and dashboard tools to test the flow before going live. When going live, switch to live keys and endpoints carefully.
  * **Role-based Access**: Consider using the subscription status to enforce access control. For example, certain API routes or pages (like the actual AI features beyond “basic” usage) should check `user.is_subscribed` (from Supabase) to decide if the user can use the Pro features. This can be done either in the client (fetch user profile and conditionally show UI) *and* on the server (middleware or API route checks). Since you’ll have a middleware for auth, you could also extend it to redirect non-subscribed users away from certain routes. Additionally, Supabase Row-Level Security can be configured if you want the database itself to enforce that only subscribed users can access certain data rows or call certain Postgres functions – this is an advanced option, but worth noting for full security.
  * **Testing & CI**: Once these implementations are done, test all flows thoroughly:

    * Sign up/login via Supabase Auth, ensure session is synced by middleware (e.g., SSR pages know the user).
    * Try the Stripe checkout flow in test mode: does it redirect, does the webhook update the profile, does the UI reflect the new subscription?
    * Try canceling a subscription from the Stripe dashboard (or implement a “Manage Subscription” link to Stripe Customer Portal) and ensure the webhook downgrades the user in Supabase.
    * Test embedding and pinecone functions via the provided scripts.
    * On deployment to Vercel, double-check that writing to the database works (no file system writes). The Reddit community emphasizes that a Vercel function **cannot reliably write to disk**, so our changes to use Supabase should resolve the prior local-file approach.
    * Set up a basic CI workflow (GitHub Actions) to run tests on push, if possible. This can lint the code and run the `tests/` scripts to prevent broken deployments.
  * **Monitoring**: Consider logging or error tracking for the webhook and subscription flow (Stripe will send alerts if webhooks fail). You might use console logs (viewable in Vercel function logs) or integrate an error reporting service for production.

## Ideal Stripe + Supabase Integration Approach

To integrate **Stripe and Supabase securely and smoothly**, here’s the ideal flow consolidating the above points:

1. **User Sign Up / Profile Setup**: When a user signs up via Supabase Auth, create a corresponding **Stripe Customer** for that user. You can do this on-demand when they initiate a subscription, or proactively at sign-up. For instance, at sign-up time (after `supabase.auth.signUp` success), call `stripe.customers.create({ email })` and store the returned `customer.id` in the user’s `stripe_customer_id` field in Supabase. This ties the Supabase user to Stripe. (If you choose to only do it at checkout time, that’s also fine – you’d create the customer if none exists.)
2. **Initiating Subscription (Upgrade)**: In the application when the user chooses to upgrade:

   * Frontend triggers a request (e.g., clicking “Go Pro” calls your Next API).
   * The Next.js API route (protected by auth) uses the Stripe Secret Key to create a **Checkout Session** with the pre-defined Price ID for the subscription. It includes the `customer` (stripe\_customer\_id from Supabase) and `success_url`/`cancel_url`. The session is created in **Subscription mode**, which means Stripe will handle creating the subscription and charging the user’s card.
   * The API returns the `session.url` to the client (or a session ID to use with Stripe.js). The client is then redirected to **Stripe’s Checkout** page. This hosted page is secure and handles all payment details – ensuring that **no sensitive data touches your servers**.
3. **Payment Completion**: After the user completes payment on Stripe Checkout:

   * Stripe will redirect them to your `success_url`. You can have a Next.js page there that maybe thanks them and instructs them to wait a moment while their account updates. But **don’t rely solely on this page to update state**.
   * More importantly, Stripe fires a **webhook event** (e.g., `checkout.session.completed` and `customer.subscription.created`). This webhook event reaches your `/api/stripe/webhook` handler on Vercel.
4. **Webhook Processing**: In the webhook handler:

   * Verify the event (using the raw body and signing secret). This ensures the request is truly from Stripe.
   * Parse the event data. For a successful checkout, you’ll get `event.type === 'checkout.session.completed'` with `event.data.object` containing the Checkout Session info. That session in subscription mode includes fields like `customer` (ID) and `subscription` (ID of the new subscription).
   * Use the `subscription` ID to retrieve full details if needed (Stripe’s API can fetch the subscription object which has status, plan, current period, etc., but Stripe also often includes `subscription` in the event data already for session.completed).
   * Update Supabase: find the user by the stripe\_customer\_id (or you might have stored the mapping of Stripe session to user via metadata). E.g., if you stored user\_id in the Checkout Session’s metadata, you can use that to know which Supabase user to update. The Vercel starter uses the Supabase service key to upsert subscription info in the DB on these events.
   * Set the user’s `is_subscribed` to true, save the `stripe_subscription_id`, set `subscription_status = 'active'` (if active immediately) and store any other relevant info (perhaps the plan name or interval for reference).
   * Respond with 200 to Stripe quickly.
5. **Post-Upgrade Experience**: When the user is redirected back, your app can now show that they are Pro. How to reflect this?

   * Since our middleware runs on every request, and if we potentially have Supabase JWT including custom claims, we could surface a user role. Simpler: on the client, after returning to the app, you might call `supabase.auth.getSession()` or refresh user data, and query the updated profile (via a supabase query or your own API) to see that `is_subscribed` is now true. Then, unlock Pro features in the UI.
   * You might also provide a **“Manage Subscription” link** that opens Stripe’s **Customer Portal** (Stripe has a hosted portal for subscription management). That would allow the user to change payment method or cancel on their own. Implementing this is optional but user-friendly: you’d create a portal session via Stripe API and redirect them to it.
   * If a user cancels, Stripe will send a webhook (subscription.updated or subscription.deleted). Your webhook handler should catch that and update `subscription_status` to canceled or mark the user as not subscribed (perhaps keep them Pro until period end, which Stripe usually handles access until end of billing period). Depending on your app’s policy, you might immediately revoke access or let them use Pro until their paid period expires. You’ll have the `current_period_end` date from Stripe to know when to downgrade.
6. **Profiles vs Subscriptions Table**: Given the above, using the `profiles` table is adequate. Each webhook event can update the single profile row for the user:

   * On subscription start: set profile.is\_subscribed = true, profile.stripe\_subscription\_id = XYZ, profile.subscription\_status = active, profile.plan = "Pro", profile.current\_period\_end = date.
   * On cancel: set status = canceled (or false), and maybe keep the date until which they had access. Optionally, you could clear `is_subscribed` after the period passes, or simply rely on status field.
   * On renewal payment failure, Stripe could send an event (invoice.payment\_failed) – you might email the user or mark something, but at minimum if Stripe ultimately cancels the sub, you get the subscription.deleted event.
   * The trade-off: if you needed to log each subscription event (for analytics or record), a separate `subscriptions` table would record each subscription instance or changes. But if not needed, the profile’s fields can be considered the **current subscription state** of the user.
   * Ensure that these profile fields are **only writable by the server (via service role or supabase admin)**, not by the client directly. Normal users should not be able to give themselves a Pro flag. Supabase RLS can enforce that (e.g., users can read their profile, but cannot update the subscription fields on their own unless done via a secure function).
7. **Testing & Security**: Use Stripe’s test mode to run through this flow. Make sure to test:

   * **Double submission**: prevent multiple checkout sessions if user clicks twice.
   * **Webhook security**: send an invalid signature to ensure your endpoint rejects it.
   * **Unauthorized access**: verify that without a Pro subscription, protected features/API endpoints indeed block or limit access.
   * **Edge cases**: subscription renewed (should remain active), card updated (should have no effect on your app state), subscription canceled (user should be downgraded accordingly).
   * As a best practice, log some events or use Stripe’s dashboard to monitor events coming through. Stripe’s dashboard also shows if webhooks are failing.
   * Keep all Stripe secrets out of client-side code. Only `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is used on the client (for Stripe.js if needed); all others are server-only.
   * Again, do **not store any credit card data** in Supabase or anywhere in your app – leave that entirely to Stripe’s managed forms and vault. Our database will only store identifiers and statuses.

## Conclusion and Next Steps

With Supabase Auth confirmed and Stripe chosen for payments, the development plan is clear. **Implement the subscription workflow with Stripe** (checkout page, API route, webhook handler, and DB updates) and remove any Square-related code. **Fill in missing pieces in the codebase**: the Supabase auth middleware, embedding and Pinecone functions, and migrate file-based storage to Supabase. Throughout, maintain strong security practices – keep secrets out of the repo, verify external calls (Stripe webhooks), and limit access based on subscription status. Once these are done, the project will be on solid footing for a Vercel deployment with a secure, scalable foundation.

By following the above steps, you’ll integrate Stripe and Supabase in a way that is **secure (PCI compliant, no sensitive data leakage)** and **smooth for users**. Supabase will serve as the single source of truth for user status (free or pro), and Stripe will handle all financial details. This alignment of responsibilities – Supabase for auth/data, Stripe for payments – leverages each platform’s strengths and is a proven approach for SaaS applications.

Finally, update documentation (README) to reflect the setup (env vars needed, how to run webhooks locally, etc.), and consider setting up monitoring/alerting for the production webhooks and errors. With these implementations and precautions in place, your application will be ready for production with confidence in its **authentication, payment, and data handling** workflows.
