# UnibenPlug

Next.js 14 App Router, Tailwind, Supabase, Leaflet (OpenStreetMap tiles). Launches with UNIBEN only.
No payments or boosting: every post is shown in the same order (newest first, urgent posts briefly above that).

## Set up
1. Create a Supabase project. In **Authentication > Providers > Email**, turn OFF "Confirm email".
2. SQL editor: paste and run `supabase/schema.sql` (once).
3. `cp .env.example .env.local` and fill the keys. A Sightengine account is optional, for the nudity check on photos.
4. `npm install && npm run dev`
5. Sign up in the app, then in the SQL editor: `update profiles set is_admin = true where phone = 'YOUR PHONE';`
6. Database > Extensions: enable `pg_cron`, then uncomment the `cron.schedule` line at the end of the hourly-job block in schema.sql and run it.
7. Deploy: push to GitHub, import in Vercel, add the same env vars.

## Where the rules live
All moderation (banned words, first 2 posts pending, 3 strikes ban, urgent, 24h expiry) is in the `create_post` SQL function, so it cannot be skipped from the browser. Reports, ratings and views also go through SQL functions; direct inserts are blocked by RLS.

## Small additions to your spec (needed to work)
- `profiles.is_admin` so /admin can be locked to admins.
- Login uses phone + password by turning the phone number into a hidden email (`0801...@unibenplug.app`), because Supabase phone login needs a paid SMS provider.
- Views `feed_posts`, `seller_public` so the public map can show seller name, verified badge and rating without exposing phone numbers.
- NEED categories: I read your list as 8 (Cleaning, Laundry & Errand is one).

## Known limits
- Views only count for logged-in visitors (post_views needs a viewer_id).
- The 24h rating popup uses tap times stored on the buyer's device.
- Nudity check runs only if the Sightengine keys are set. Check the response field names against their docs.
- Not run end to end: I had no network in my workspace, so `npm install` and a Supabase test were not possible. Expect a small fix or two on first run.
