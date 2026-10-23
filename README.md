# Swiftplate | Food delivery platform

One backend, four roles: customer, kitchen (vendor), rider and admin.
Built by Raji Ibrahim Ajibola ([portfolio](https://ibrahimraji.vercel.app), [GitHub](https://github.com/jibolaaa)).

Swiftplate is a demo. The kitchens and orders are for testing, and payments run in Paystack test mode, so no food is delivered and no real money moves.

## Try it
- **Customer** (`/`, `/kitchens`, `/orders`): pick a kitchen, add dishes, pay with Paystack (card or bank transfer), then follow the order: when it should arrive, where it is now on a drawn route, and every step with its time.
- **Kitchen** (`/vendor`): paid orders pop up on a board. Accept, cook, mark ready. Each step shows a tick when it goes through.
- **Rider** (`/rider`, and the phone app): take a ready job, pick it up, deliver it.
- **Admin** (`/admin`): every order, who handled it, and revenue.
- **How it's built** (`/platform`, in the menu): the order state machine and the rules that keep it honest.

Sign in at `/login` with one tap as any demo person (password `password123`): customer@swiftplate.test, vendor@swiftplate.test, rider@swiftplate.test, admin@swiftplate.test. The browser keeps one session per role, so you can be all four at once, one per tab.

## Look and feel
Warm and tasty: a cream background like a menu card, ink like a chalkboard, tomato red for anything you tap, pepper green for "open" and "delivered", yolk yellow for anything new. One typeface, Bricolage Grotesque (self-hosted, SIL Open Font License), which gets chunkier as it gets bigger and includes the ₦ sign.

## How it works
- **Postgres schema** (db/schema.sql): users with roles, restaurants, menus, orders, order items, status history, payments, reviews.
- **Auth:** bcrypt password hashes and signed JWT sessions. A wrong email and a wrong password get the same reply.
- **RBAC:** `requireAuth(req, ["admin"])` style role gates on every route, plus ownership checks (a kitchen can only move its own orders; a rider only the jobs they took).
- **Order state machine:** pending, accepted, preparing, ready, rider_assigned, picked_up, delivered (or cancelled). One table of transitions in `app/api/orders/[id]/transition` decides who may move an order, and from where.
- **No double claims:** a transition only applies if the order is still in the state that was checked, so two riders tapping at once can't both get the job (optimistic concurrency; the loser gets a 409).
- **Server-side pricing:** the client sends dish ids and quantities only. The server reads real prices and snapshots each dish's name and price into the order.
- **Pay first, then cook:** an order is saved together with an unpaid payment record (one SQL statement), and the kitchen and riders can't see it until that record says paid. The server starts a Paystack checkout (card or bank transfer), then confirms the payment with Paystack itself, checks the amount and currency match the order, and only then marks it paid. Checking again is safe: an order is only marked paid once. A paid order cancelled before the kitchen accepts it is refunded through Paystack, and so is a payment that lands after the order was cancelled.
- **Paystack webhook** (`/api/paystack/webhook`): optional. It checks Paystack's signature (HMAC SHA-512 of the body with the secret key) and confirms the payment the same way, for customers who pay and never come back to the site.
- **Arrival time:** worked out from when each step happened and how long each stage usually takes (accept, cook, find a rider, ride). There's no GPS, so the rider's spot on the route is an estimate from when the food was picked up, and the page says so.
- **Near-live updates:** screens check every 5 seconds. A realtime service (Pusher, Supabase Realtime) is the upgrade path, since plain WebSockets don't suit Vercel's serverless functions.
- **Phone apps** (`mobile/`): customer and rider apps in React Native, with the same look as the website. Each one is a single App.js: open it in Expo Snack (snack.expo.dev) and scan the code with Expo Go. They use the live API, so an order placed in the app shows up on the kitchen board and the rider's list. The customer app opens Paystack in the phone's browser (expo-web-browser) and picks up the payment by itself when you come back; its route is drawn with react-native-svg.
- **Fresh lists:** the kitchens API reads the database on every request (`dynamic = "force-dynamic"`), so a kitchen that opens, closes or changes its menu shows up in the apps straight away instead of waiting for the next deploy.

## Project layout
- `app/(shop)/` customer pages: home, kitchens, kitchen menus (`/r/[id]`), checkout, the page Paystack sends you back to (`/pay/done/[id]`), orders and tracking, how it's built
- `app/login`, `app/vendor`, `app/rider`, `app/admin` sign-in and the role screens
- `app/api/` the API all apps share; `app/test` a raw API test console
- `components/` header, footer, order (cart) state, dish cards, the role screen frame
- `lib/` database, auth, sessions, roles, payments (Paystack), food photos, order steps and the arrival estimate
- `mobile/` the Expo apps

## Setup
1. Create a free Postgres at neon.tech
2. Open Neon's SQL Editor, paste the whole of db/schema.sql, run it
3. Import this repo on vercel.com/new and set env vars:
   - DATABASE_URL: your Neon connection string
   - JWT_SECRET: any long random string
   - SEED_SECRET: any password you choose (protects demo seeding)
   - PAYSTACK_SECRET_KEY: your Paystack test secret key (starts with sk_test_), from Paystack's dashboard under Settings, API Keys & Webhooks. It stays on the server.
4. Deploy, open /test on the live URL: health check, then seed, then sign in as each role
5. Optional: in Paystack, set the Test Webhook URL to `https://<your site>/api/paystack/webhook`

Paystack's test card: 4084 0840 8408 4081, any future expiry, CVV 408. Bank transfer works in test mode too.

Running it on a laptop with plain Postgres: run `npm install`, set `DATABASE_URL` to your database and `DATABASE_DRIVER=pg`, then `npm run dev`. The same queries run through node-postgres instead of Neon's HTTP driver.
