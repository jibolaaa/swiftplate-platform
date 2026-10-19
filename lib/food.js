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

// "2:05pm" in Lagos time (UTC+1, no daylight saving), the same on server and phone.
export function lagosTime(d) {
  const t = new Date(new Date(d).getTime() + 3600_000);
  const h = t.getUTCHours(), m = t.getUTCMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
}

export const shortId = (id = "") => id.slice(0, 6).toUpperCase();
