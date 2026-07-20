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
- Phase 2: order lifecycle endpoints (the state machine in motion)
- Phase 3: vendor + admin web dashboards
- Phase 4: customer mobile app (React Native / Expo)
- Phase 5: rider mobile app + real-time updates
