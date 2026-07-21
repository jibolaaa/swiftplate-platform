# Swiftplate | Multi-role Food Delivery Platform

One backend, four roles: customer, vendor, rider, admin.
Built by Raji Ibrahim Ajibola (github.com/jibolaaa).

## Phase 1 (this): core API
- Postgres schema: users + roles, restaurants, menu, orders as a state
  machine, order status history, payments, reviews (db/schema.sql)
- Auth: bcrypt password hashing + JWT sessions
- RBAC: requireAuth(req, ["admin"]) style role gates on every route
- Phone test console at /test: tap buttons, see raw API responses

## Setup
1. Create a free Postgres at neon.tech
2. Open Neon's SQL Editor, paste the whole of db/schema.sql, run it
3. Import this repo on vercel.com/new and set env vars:
   - DATABASE_URL: your Neon connection string
   - JWT_SECRET: any long random string
   - SEED_SECRET: any password you choose (protects demo seeding)
4. Deploy, open /test on the live URL:
   health check -> seed -> log in as each role -> watch RBAC allow/deny

Demo accounts after seeding (password: password123):
admin@swiftplate.test, vendor@swiftplate.test,
rider@swiftplate.test, customer@swiftplate.test

## Roadmap
- Phase 2 (done): order lifecycle. Role-gated state machine, ownership checks, server-side pricing with the snapshot pattern, full status history timeline, admin overview with revenue.
- Phase 3 (done): vendor + admin web dashboards. Login with role routing, vendor order queue with state-machine action buttons, admin stats + all-orders table, 5s polling until Phase 5 realtime.
- Phase 4 (done): customer mobile app (React Native, runs in Expo Go via Expo Snack). Login, browse restaurants, cart, checkout, live order tracking polling every 5s. Code: mobile/customer-app/App.js
- Phase 5 (done): rider mobile app (React Native, Expo Go via Snack). Dark theme, claim/pickup/deliver flow, session stats. Realtime: 5s polling everywhere; a persistent-connection service (e.g. Pusher/Supabase Realtime) is the noted upgrade path since raw WebSockets do not fit Vercel serverless. Code: mobile/rider-app/App.js
