# Implementation To-Do List from updatedPlan.md

## Notes:
- A Stripe Webhook is not yet set up. This will be required for Stripe to send updates back to the application after a payment is made.
- The current Stripe environment is for development (using test keys), not production.
- I (the AI) cannot view the `.env.local` file and am proceeding with the assumption that the necessary Stripe test keys are populated.
- The `npm install` command requires the `--legacy-peer-deps` flag to resolve dependency conflicts.
- **Architectural Decision:** We are implementing a **logically multi-tenant** architecture. All data will reside in a single database, and data isolation between users will be enforced using Supabase's Row Level Security (RLS). Every table containing user-specific data must have a `user_id` column and corresponding RLS policies. This is a secure, scalable, and standard approach.

Here is a comprehensive, detailed, step-by-step to-do list to implement the plan outlined in `updatedPlan.md`:

## Phase 1: Foundational Setup and Security

1.  **Environment Setup and Secrets Management:**
    - [x] Create a `.env.local` file for development secrets (ensure this file is in `.gitignore`).
    - [x] Add the following environment variables to `.env.local` and your production environment (e.g., Vercel dashboard):
        - [x] `SUPABASE_URL`
        - [x] `SUPABASE_ANON_KEY`
        - [x] `SUPABASE_SERVICE_ROLE_KEY` (Server-only)
        - [x] `OPENAI_API_KEY` (Server-only)
        - [x] `PINECONE_API_KEY` (Server-only)
        - [x] `PINECONE_ENVIRONMENT` (Server-only)
        - [x] `PINECONE_INDEX` (Server-only)
        - [x] `STRIPE_SECRET_KEY` (Server-only)
        - [x] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Client and Server)
        - [x] `STRIPE_WEBHOOK_SECRET` (Server-only)
    - [x] **Action:** Remove `users_rows.json` from the repository and ensure it's not committed. If it contains real data, handle it securely outside the repository.
    - [ ] **Action:** Rotate any API keys (OpenAI, Supabase) that might have been exposed in the repository's history.

2.  **Supabase Authentication Middleware:**
    - [x] Create a `middleware.ts` file at the project root.
    - [x] Import `updateSession` from `lib/clients/supabase/middleware.ts`.
    - [x] Implement the middleware to call `updateSession()` on every request.
    - [x] Configure the `matcher` in `middleware.ts` to protect routes that require authentication (e.g., `/app/(protected.*)` or specific routes as needed).
    - [x] Implement redirection logic in the middleware to send unauthorized users to a login page (e.g., `/login`).
    - [x] **Action:** Create the `/login` page component and route if it doesn't exist.

## Phase 2: Stripe Integration

3.  **Add Stripe Dependencies:**
    - [x] Install the necessary Stripe libraries: `npm install stripe @stripe/stripe-js`
    - [x] **Action:** Run `npm install stripe @stripe/stripe-js`.

4.  **Implement Stripe Checkout Session API:**
    - [x] Create a new API route for creating Stripe checkout sessions (e.g., `app/api/stripe/create-checkout-session/route.ts`).
    - [x] In this route, import and initialize the Stripe server SDK with `STRIPE_SECRET_KEY`.
    - [x] Implement logic to handle the POST request:
        - [x] Verify the user's authentication status (ensure a Supabase session exists).
        - [x] Retrieve the user's `stripe_customer_id` from their Supabase profile. If it doesn't exist, create a new Stripe customer using `stripe.customers.create` with the user's email and store the returned `customer.id` in the Supabase profile.
        - [x] Create a Stripe Checkout Session using `stripe.checkout.sessions.create` with:
            - [x] `mode: 'subscription'`
            - [x] The Price ID of your "Pro" plan (defined in your Stripe Dashboard).
            - [x] `customer`: The user's `stripe_customer_id`.
            - [x] `success_url`: The URL to redirect to after successful checkout (e.g., `${YOUR_APP_URL}/pro/success`).
            - [x] `cancel_url`: The URL to redirect to if the user cancels checkout (e.g., `${YOUR_APP_URL}/pro/canceled`).
            - [x] Optionally, include `client_reference_id` or `metadata` to link the Stripe session back to the Supabase user.
        - [x] Return the `session.url` in the API.

5.  **Frontend Integration for Checkout:**
    - [x] On the frontend (e.g., on an upgrade page), create a button to trigger the Stripe checkout process.
    - [x] Attach an event handler to the button that calls the `/api/stripe/create-checkout-session` API route.
    - [x] Upon receiving the `session.url` from the API, redirect the user to that URL (Stripe's hosted checkout page).

6.  **Implement Stripe Webhook Endpoint:**
    - [x] Create a new API route to handle Stripe webhooks (e.g., `app/api/stripe/webhook/route.ts`).
    - [x] **Important:** Disable Next.js default body parsing for this route. You'll need to access the raw request body.
    - [x] Import and initialize the Stripe server SDK.
    - [x] In the POST handler:
        - [x] Get the raw request body.
        - [x] Get the `Stripe-Signature` header from the request.
        - [x] Construct the event using `stripe.webhooks.constructEvent` with the raw body, signature, and `STRIPE_WEBHOOK_SECRET`. Handle potential signature verification errors (return 400).
        - [x] Handle relevant event types:
            - [x] `checkout.session.completed`:
                - [x] Retrieve the session object from `event.data.object`.
                - [x] Get the `customer` and `subscription` IDs from the session.
                - [x] Use the `customer` ID (or metadata if you included `user_id` there) to find the corresponding user in Supabase.
                - [x] Update the user's profile in Supabase using the service role key: set `is_subscribed = true`, store `stripe_subscription_id`, `stripe_customer_id`, `subscription_status = 'active'`, and `current_period_end` if available.
            - [x] `customer.subscription.updated`:
                - [x] Retrieve the subscription object from `event.data.object`.
                - [x] Get the `customer` ID from the subscription.
                - [x] Find the user in Supabase by `stripe_customer_id`.
                - [x] Update the user's `subscription_status` and `current_period_end` based on the event data (e.g., 'canceled', 'active', 'trialing').
            - [x] `customer.subscription.deleted`:
                - [x] Retrieve the subscription object.
                - [x] Get the `customer` ID.
                - [ ] Find the user in Supabase.
                - [ ] Update the user's profile to reflect the cancellation (e.g., set `is_subscribed = false`, update `subscription_status`).
            - [ ] Handle other relevant events (`invoice.payment_succeeded`, etc.) as needed.
        - [ ] Return a 200 response quickly to acknowledge receipt of the webhook.

7.  **Supabase Database Schema Update:**
    - [x] In your Supabase project, add the following columns to your `profiles` table (or equivalent user meta table):
        - [x] `stripe_customer_id` (Text)
        - [x] `stripe_subscription_id` (Text)
        - [x] `subscription_status` (Text, e.g., active, canceled, trialing) - or a boolean `is_subscribed`.
        - [x] `current_period_end` (Timestamp with time zone) - Optional, but useful for tracking expiry.
        - [x] `plan` or `stripe_price_id` (Text) - Optional, if you plan for multiple tiers.
    - [x] **Action:** Apply these schema changes in your Supabase database.

8.  **Update Supabase Row Level Security (RLS):**
    - [x] If RLS is enabled on your `profiles` table, ensure that the service role key has permission to update the relevant subscription-related fields.
    - [x] Ensure that regular users can read their own profile but cannot update the subscription-related fields directly from the client.

9.  **Frontend Post-Checkout Pages:**
    - [x] Create a success page (e.g., `/pro/success`) to inform the user that their upgrade was successful. On this page, you might refetch the user's profile from Supabase to display their updated subscription status.
    - [x] Create a cancel page (e.g., `/pro/canceled`) to handle cases where the user abandons the checkout process.

10. **Implement "Manage Subscription" (Optional but Recommended):**
    - [x] Create an API route (e.g., `/api/stripe/create-customer-portal-session`) to create a Stripe Customer Portal session.
    - [x] In this route, use the Stripe SDK with the service role key to create a portal session for the authenticated user using their `stripe_customer_id`.
    - [x] Return the portal `url` to the frontend.
    - [x] On the frontend, provide a "Manage Subscription" link that calls this API and redirects the user to the Stripe Customer Portal, where they can update their payment methods or cancel their subscription.

## Phase 3: Addressing AI and Data Persistence Gaps

11. **Verify Embedding and Upsert Implementations:**
    - [x] Confirm that `lib/functions/openai/embeddings.ts` contains the `getTextEmbedding` function.
    - [x] Confirm that `lib/functions/pinecone/upsertVectors.ts` contains the `indexDocument` or `upsertVectors` function that uses the Pinecone client and the embedding function.

12. **Migrate Chat Log Storage to Supabase:**
    - [x] **Decision:** Choose between Supabase Database (Option 1) or Supabase Storage (Option 2) for storing chat logs. The plan recommends using the Database.
    - [x] **If using Supabase Database:**
        - [x] Create a new table in Supabase (e.g., `chat_messages` or `contexts`) with appropriate columns (e.g., `id`, `user_id` (referencing `auth.users`), `role`, `content`, `created_at`).
        - [x] Update the `/api/context` API route to write chat messages to this new Supabase table instead of writing to local files in the `data/` directory. Use the Supabase client with appropriate authentication (e.g., user's JWT or service role for server-side operations).
        - [x] Update any logic that reads chat history to fetch it from the Supabase table.
        - [x] Implement RLS policies on the new table to ensure users can only access their own chat messages.
    - [ ] **If using Supabase Storage:**
        - [ ] Create a new storage bucket in Supabase.
        - [ ] Update the `/api/context` API route to save chat conversation files to this storage bucket instead of the local file system.
        - [ ] Update any logic that reads chat history to fetch it from Supabase Storage.
        - [ ] Configure bucket policies or use signed URLs to secure access to the chat files, ensuring users can only access their own.
    - [x] **Action:** Implement the chosen data persistence method for chat logs and update the `/api/context` route.
    - [x] **Action:** Delete the `data/` directory and its contents from the repository.

13. **Update Chat Log Download Route (if applicable):**
    - [x] If you have an `/api/context/download` route for users to download their chat history, update it to fetch the data from the new Supabase source (DB or Storage) and format it for download.

## Phase 4: Testing and Refinement

14. **Add Test Script to `package.json`:**
    - [x] Add a script to `package.json` to run the test files in the `tests/` directory (e.g., using `tsx` or a testing framework).
    - [x] **Action:** Add the test script to `package.json`.

15. **Run and Fix Tests:**
    - [x] Run the test script (`npm run test`) and fix any errors in the existing test files (`testEmbeddings.ts`, `testUpsert.ts`, etc.) to ensure the implemented functions work correctly.

16. **Thorough Testing of All Flows:**
    - [ ] Test the user signup and login flow via Supabase Auth, ensuring sessions are synced by the middleware.
    - [ ] Test the Stripe checkout flow in test mode:
        - [ ] Initiate checkout from the frontend.
        - [ ] Complete a test payment on Stripe's hosted page.
        - [ ] Verify that the Stripe webhook is received by your endpoint.
        - [ ] Verify that the user's profile in Supabase is updated correctly (is_subscribed, stripe_subscription_id, etc.).
    - [ ] Test subscription cancellation (via Stripe Dashboard or Customer Portal if implemented) and verify that the webhook updates the user's status in Supabase.
    - [ ] Test access control: ensure that protected routes and features are only accessible to subscribed users.
    - [ ] Test the embedding and Pinecone upsert functionality.
    - [ ] Test the chat log storage (writing and reading) using the new Supabase implementation.
    - [ ] If implemented, test the chat log download route.

17. **Security Review:**
    - [ ] Double-check that no secrets are committed to the repository.
    - [ ] Verify Stripe webhook signature verification is correctly implemented.
    - [ ] Review Supabase RLS policies.
    - [ ] Ensure that sensitive operations (like updating subscription status) are only performed on the server-side using the service role key.

18. **Update Documentation (README):**
    - [ ] Update the README file to reflect the new setup:
        - [ ] List required environment variables (for development and production).
        - [ ] Explain how to run webhooks locally (e.g., using Stripe CLI).
        - [ ] Provide instructions for setting up Supabase and Stripe.

19. **Consider Monitoring and Alerting:**
    - [ ] Set up monitoring for your Vercel functions, especially the Stripe webhook handler, to catch errors in production.
    - [ ] Configure alerts for failed webhooks in your Stripe dashboard.

---
## Developer Notes:
- In `app/api/stripe/create-checkout-session/route.ts`, you need to replace the placeholder `price_1P6TkRRxpExSjA35x2VjJvEY` with your actual Stripe Price ID for the "Pro" plan. You can create a product and get a price ID from your Stripe Dashboard.
