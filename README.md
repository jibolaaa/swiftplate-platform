# Swiftplate | Food delivery platform

One backend, four roles: customer, kitchen (vendor), rider and admin.
Built by Raji Ibrahim Ajibola ([portfolio](https://ibrahimraji.vercel.app), [GitHub](https://github.com/jibolaaa)).

Swiftplate is a demo. The kitchens and orders are for testing; no food is delivered and no money is taken.

## Try it
- **Customer** (`/`): pick a kitchen, add dishes, check out, then follow the order step by step on its tracking page.
- **Kitchen** (`/vendor`): new orders pop up on a board. Accept, cook, mark ready.
- **Rider** (`/rider`, and the phone app): take a ready job, pick it up, deliver it.
- **Admin** (`/admin`): every order, who handled it, and revenue.
- **How it's built** (`/platform`): the order state machine and the rules that keep it honest.

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
- **Near-live updates:** screens check every 5 seconds. A realtime service (Pusher, Supabase Realtime) is the upgrade path, since plain WebSockets don't suit Vercel's serverless functions.
- **Phone apps** (`mobile/`): customer and rider apps in React Native, with the same look as the website. Each one is a single App.js: open it in Expo Snack (snack.expo.dev) and scan the code with Expo Go. They use the live API, so an order placed in the app shows up on the kitchen board and the rider's list.
- **Fresh lists:** the kitchens API reads the database on every request (`dynamic = "force-dynamic"`), so a kitchen that opens, closes or changes its menu shows up in the apps straight away instead of waiting for the next deploy.

## Project layout
- `app/(shop)/` customer pages: home, kitchen menus (`/r/[id]`), checkout, orders and tracking, how it's built
- `app/login`, `app/vendor`, `app/rider`, `app/admin` sign-in and the role screens
- `app/api/` the API all apps share; `app/test` a raw API test console
- `components/` header, footer, order (cart) state, dish cards, the role screen frame
- `lib/` database, auth, sessions, roles, food photos and order steps
- `mobile/` the Expo apps

## Setup
1. Create a free Postgres at neon.tech
2. Open Neon's SQL Editor, paste the whole of db/schema.sql, run it
3. Import this repo on vercel.com/new and set env vars:
   - DATABASE_URL: your Neon connection string
   - JWT_SECRET: any long random string
   - SEED_SECRET: any password you choose (protects demo seeding)
4. Deploy, open /test on the live URL: health check, then seed, then sign in as each role

Running it on a laptop with plain Postgres: run `npm install`, set `DATABASE_URL` to your database and `DATABASE_DRIVER=pg`, then `npm run dev`. The same queries run through node-postgres instead of Neon's HTTP driver.
