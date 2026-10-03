# Two things in this folder

## 1. preview.html - open this directly, no setup needed
Double-click `preview.html` (or open it in any browser). It looks and works like the real
site, but it is a demo only: everything happens inside the page, so posts, payments and
logins are not real and disappear on refresh. Good for showing someone how it looks and flows.

## 2. Everything else - the real website
This is a Next.js + Supabase + Paystack project. It cannot be opened by double-clicking a
file - it needs to be built and run. This is normal for this type of app; nothing is missing.

To run it locally:
1. Install Node.js (nodejs.org) if not already installed.
2. Open a terminal in this folder and run:
   npm install
   npm run dev
3. Open http://localhost:3000 in a browser.

It will not fully work yet without a Supabase project and Paystack keys - see README.md for
the full setup steps (database, environment variables, and deploying to Vercel to get a real
public link).
