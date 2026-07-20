-- ============================================================
--  FOOD DELIVERY PLATFORM · DATABASE SCHEMA (Phase 1)
--  PostgreSQL. Read top to bottom; each table only references
--  tables defined above it.
--
--  Two rules used everywhere:
--  1) IDs are UUIDs, not 1,2,3... so they aren't guessable.
--  2) Money is INTEGER KOBO (N1 = 100 kobo). Paystack works in
--     kobo, and integers can't have float rounding bugs.
-- ============================================================

-- ============================================================
--  1. USERS: all four roles in one table, separated by `role`.
--     This single table is the heart of RBAC (role-based access
--     control). Customer, vendor, rider, admin are all just rows
--     here with a different role value.
-- ============================================================
CREATE TABLE users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role           TEXT NOT NULL CHECK (role IN ('customer','vendor','rider','admin')),
    full_name      TEXT NOT NULL,
    email          TEXT UNIQUE NOT NULL,
    phone          TEXT UNIQUE NOT NULL,
    password_hash  TEXT NOT NULL,        -- bcrypt/argon2 hash. NEVER raw passwords.
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Teaching note:
--   The CHECK constraint means the database itself refuses any role
--   outside these four. Correctness enforced at the data layer,
--   not just in your code.

-- ============================================================
--  2. RIDER_PROFILES: extra fields only riders need.
--     A "satellite" table instead of stuffing rider columns into
--     users (where they'd be NULL for everyone else).
-- ============================================================
CREATE TABLE rider_profiles (
    user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    vehicle_type   TEXT NOT NULL DEFAULT 'bike' CHECK (vehicle_type IN ('bike','car','foot')),
    is_online      BOOLEAN NOT NULL DEFAULT FALSE,   -- rider toggles availability
    current_lat    DOUBLE PRECISION,
    current_lng    DOUBLE PRECISION,
    location_updated_at TIMESTAMPTZ
);
-- Teaching note:
--   user_id is BOTH primary key AND foreign key, which guarantees
--   exactly one profile per user (a one-to-one relationship).
--   ON DELETE CASCADE: delete the user, the profile auto-deletes.

-- ============================================================
--  3. RESTAURANTS: each owned by a vendor user.
--     One vendor can own many restaurants (one-to-many).
-- ============================================================
CREATE TABLE restaurants (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    description    TEXT,
    address        TEXT NOT NULL,
    lat            DOUBLE PRECISION,
    lng            DOUBLE PRECISION,
    is_open        BOOLEAN NOT NULL DEFAULT FALSE,   -- vendor toggles open/closed
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
--  4. MENU_ITEMS: dishes belonging to a restaurant.
-- ============================================================
CREATE TABLE menu_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id  UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    description    TEXT,
    price_kobo     BIGINT NOT NULL CHECK (price_kobo >= 0),  -- N2,500 stored as 250000
    image_url      TEXT,
    is_available   BOOLEAN NOT NULL DEFAULT TRUE,            -- "sold out" toggle
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
--  5. ORDERS: the CENTRAL table. The whole platform is a single
--     order row moving through `status`. That column IS the
--     state machine every role acts on:
--     customer creates (pending), vendor moves it, rider moves
--     it, until delivered.
-- ============================================================
CREATE TABLE orders (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id    UUID NOT NULL REFERENCES users(id),
    restaurant_id  UUID NOT NULL REFERENCES restaurants(id),
    rider_id       UUID REFERENCES users(id),   -- NULL until a rider is assigned

    status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN (
                       'pending',         -- placed, waiting for vendor
                       'accepted',        -- vendor accepted
                       'preparing',       -- kitchen cooking
                       'ready',           -- food ready for pickup
                       'rider_assigned',  -- a rider took the job
                       'picked_up',       -- rider has the food
                       'delivered',       -- done
                       'cancelled'        -- terminated, see cancel_reason
                   )),

    delivery_address TEXT NOT NULL,
    delivery_lat     DOUBLE PRECISION,
    delivery_lng     DOUBLE PRECISION,

    subtotal_kobo     BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_kobo >= 0),
    delivery_fee_kobo BIGINT NOT NULL DEFAULT 0,
    total_kobo        BIGINT NOT NULL DEFAULT 0 CHECK (total_kobo >= 0),

    cancel_reason    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Teaching notes:
--   rider_id is nullable on purpose. An order exists before any
--   rider is found; NULL means "still searching".
--   Totals are stored ON the order so the price is FROZEN at
--   order time, even if the menu changes tomorrow.

-- ============================================================
--  6. ORDER_ITEMS: the dishes inside one order (one-to-many),
--     using the SNAPSHOT pattern.
-- ============================================================
CREATE TABLE order_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id   UUID REFERENCES menu_items(id),
    item_name      TEXT NOT NULL,        -- COPIED from the menu at order time
    unit_price_kobo BIGINT NOT NULL,     -- COPIED at order time
    quantity       INTEGER NOT NULL CHECK (quantity > 0)
);
-- Teaching note:
--   Why copy name and price instead of just linking to menu_items?
--   Because menus change. If a dish is renamed or repriced next
--   week, this order's history must still show what was actually
--   bought and paid. This is "snapshotting", a key idea for
--   anything money-related, and a favourite interview question.

-- ============================================================
--  7. ORDER_STATUS_HISTORY: a log of every status change.
--     Lets the admin see the full timeline of any order, powers
--     analytics (average prep time, delivery time), and answers
--     "what happened to order X" when debugging.
-- ============================================================
CREATE TABLE order_status_history (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status         TEXT NOT NULL,
    changed_by     UUID REFERENCES users(id),   -- who triggered it (RBAC in action)
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
--  8. PAYMENTS: one payment record per order.
-- ============================================================
CREATE TABLE payments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID NOT NULL UNIQUE REFERENCES orders(id),  -- UNIQUE: one payment per order
    amount_kobo    BIGINT NOT NULL,
    provider       TEXT NOT NULL DEFAULT 'paystack',
    provider_ref   TEXT UNIQUE,          -- the reference Paystack returns
    status         TEXT NOT NULL DEFAULT 'initiated'
                   CHECK (status IN ('initiated','paid','failed','refunded')),
    paid_at        TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
--  9. REVIEWS: one review per delivered order.
-- ============================================================
CREATE TABLE reviews (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID NOT NULL UNIQUE REFERENCES orders(id),
    rating         INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment        TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
--  10. INDEXES: make common lookups fast. Without these the DB
--      scans every row; with them it jumps straight to matches.
--      Rule of thumb: index the columns you filter by often.
-- ============================================================
CREATE INDEX idx_orders_customer    ON orders(customer_id);
CREATE INDEX idx_orders_restaurant  ON orders(restaurant_id);
CREATE INDEX idx_orders_rider       ON orders(rider_id);
CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_menu_restaurant    ON menu_items(restaurant_id);
CREATE INDEX idx_restaurants_owner  ON restaurants(owner_id);
CREATE INDEX idx_history_order      ON order_status_history(order_id);
CREATE INDEX idx_riders_online      ON rider_profiles(is_online);
