// Shared by the server and the browser: money, food photos, order steps.

// The delivery fee the API charges (app/api/orders/route.js). Kept here
// for display only: the server always works out the real total.
export const DELIVERY_FEE_KOBO = 100000;

export const naira = (kobo) => "₦" + Math.round(Number(kobo) / 100).toLocaleString("en-NG");

// Free Unsplash photos. A dish without its own image_url gets the
// closest match by name, the same way the customer app does.
const u = (id, w = 800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;
export const PHOTOS = {
  jollof: "1604329760661-e71dc83f8f26",
  soup: "1547592180-85f173990554",
  grill: "1529193591184-b1d58069ecdd",
  drink: "1437418747212-8d9709afab22",
  spread: "1504674900247-0877df9cc836"
};

export function dishKind(name = "") {
  const n = name.toLowerCase();
  if (/jollof|rice/.test(n)) return "jollof";
  if (/egusi|soup|yam|efo|okra|ogbono|swallow/.test(n)) return "soup";
  if (/suya|wrap|grill|chicken|kebab|asun/.test(n)) return "grill";
  if (/chapman|drink|zobo|juice|cl\)|smoothie/.test(n)) return "drink";
  return "spread";
}

export const dishPhoto = (dish, w) => dish?.image_url || u(PHOTOS[dishKind(dish?.name)], w);
export const kitchenPhoto = (w = 1400) => u(PHOTOS.spread, w);

// What each order status means, for the customer, the kitchen and the rider.
export const STEPS = [
  { key: "pending", label: "Order placed", note: "Waiting for the kitchen to accept it" },
  { key: "accepted", label: "Accepted", note: "The kitchen has your order" },
  { key: "preparing", label: "Cooking", note: "Your food is being made" },
  { key: "ready", label: "Packed and ready", note: "Finding a rider" },
  { key: "rider_assigned", label: "Rider assigned", note: "A rider is heading to the kitchen" },
  { key: "picked_up", label: "On the way", note: "Your food has left the kitchen" },
  { key: "delivered", label: "Delivered", note: "Enjoy your meal" }
];

export const STATUS_LABEL = {
  pending: "New order", accepted: "Accepted", preparing: "Cooking", ready: "Ready for pickup",
  rider_assigned: "Rider assigned", picked_up: "On the way", delivered: "Delivered", cancelled: "Cancelled"
};

export const stepIndex = (status) => STEPS.findIndex(s => s.key === status);

// ---------- what the customer follows on the tracking page ----------
// Money first, then the food. An order only reaches the kitchen once it is
// paid, so "Paid" is the first milestone and the rest follow the status.
export const MILESTONES = [
  { key: "paid", label: "Paid", note: "Waiting for the kitchen to accept it" },
  { key: "accepted", label: "Accepted", note: "The kitchen has your order" },
  { key: "preparing", label: "Cooking", note: "Your food is being made" },
  { key: "ready", label: "Packed and ready", note: "Finding a rider" },
  { key: "rider_assigned", label: "Rider assigned", note: "A rider is heading to the kitchen" },
  { key: "picked_up", label: "On the way", note: "Your food has left the kitchen" },
  { key: "delivered", label: "Delivered", note: "Enjoy your meal" }
];
const FLOW = ["pending", "accepted", "preparing", "ready", "rider_assigned", "picked_up", "delivered"];

// Orders from before payments (no payment row) count as paid.
export const isPaid = (payment) => !payment || payment.status === "paid";

// Index of the last milestone reached: -1 not paid yet, -2 cancelled.
export function reached(status, paid) {
  if (status === "cancelled") return -2;
  if (!paid) return -1;
  return Math.max(0, FLOW.indexOf(status));
}

// Rough minutes for each stage, for the arrival estimate. The ride time
// allows for Lagos traffic. It is an estimate, and the page says so.
export const STAGE_MIN = { accept: 3, cook: 15, rider: 5, toKitchen: 8, ride: 20 };

// times: when each status first happened ({ paid, accepted, preparing, ... }).
// Returns minutes left, the arrival time, how far along the road the food is
// (0 to 1, only once it's picked up) and where the food is now.
export function estimate({ status, paid, times = {}, now = Date.now() }) {
  if (status === "cancelled" || !paid) return null;
  const at = (k) => (times[k] ? new Date(times[k]).getTime() : now);
  if (status === "delivered") return { left: 0, arriveAt: new Date(at("delivered")), progress: 1, where: "delivered" };
  const S = STAGE_MIN;
  const since = (k) => Math.max(0, (now - at(k)) / 60000);
  let left, progress = null, where;
  switch (status) {
    case "pending":
      left = Math.max(1, S.accept - since("paid")) + S.cook + S.rider + S.toKitchen + S.ride; where = "waiting"; break;
    case "accepted":
    case "preparing":
      left = Math.max(2, S.cook - since(times.preparing ? "preparing" : "accepted")) + S.rider + S.toKitchen + S.ride; where = "cooking"; break;
    case "ready":
      left = Math.max(1, S.rider - since("ready")) + S.toKitchen + S.ride; where = "packed"; break;
    case "rider_assigned":
      left = Math.max(1, S.toKitchen - since("rider_assigned")) + S.ride; where = "to_kitchen"; break;
    case "picked_up": {
      const t = since("picked_up");
      progress = Math.min(0.92, Math.max(0.12, t / S.ride)); // starts clear of the kitchen pin
      left = Math.max(2, S.ride - t); where = "on_the_way"; break;
    }
    default: return null;
  }
  left = Math.round(left);
  return { left, arriveAt: new Date(now + left * 60000), progress, where };
}

// First time each status happened, from the order's history rows.
export function firstTimes(history = [], payment = null) {
  const t = {};
  for (const h of history) if (!t[h.status]) t[h.status] = h.created_at;
  if (!t.paid && payment?.paid_at) t.paid = payment.paid_at;
  if (!t.paid && !payment) t.paid = t.pending; // orders from before payments
  return t;
}

// "2:05pm" in Lagos time (UTC+1, no daylight saving), the same on server and phone.
export function lagosTime(d) {
  const t = new Date(new Date(d).getTime() + 3600_000);
  const h = t.getUTCHours(), m = t.getUTCMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
}

export const shortId = (id = "") => id.slice(0, 6).toUpperCase();

// "3:53am" today, "21 Oct, 3:53am" on another day (Lagos dates).
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function lagosWhen(d) {
  const day = (x) => new Date(new Date(x).getTime() + 3600_000).toISOString().slice(0, 10);
  if (day(d) === day(Date.now())) return lagosTime(d);
  const t = new Date(new Date(d).getTime() + 3600_000);
  return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]}, ${lagosTime(d)}`;
}
