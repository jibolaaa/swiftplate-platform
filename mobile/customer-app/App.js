// ============================================================
//  SWIFTPLATE · CUSTOMER APP  (React Native, Expo)
//  Order from a kitchen, then follow the order step by step.
//  Same look as the website: cream, ink, tomato red, Bricolage.
//  To try it: paste this file into App.js at snack.expo.dev and
//  open it in Expo Go. Snack adds the packages it imports.
// ============================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, TextInput, Pressable, Image, ScrollView, FlatList, ActivityIndicator,
  StyleSheet, RefreshControl, KeyboardAvoidingView, Platform, Alert
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import {
  useFonts, BricolageGrotesque_400Regular, BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold
} from "@expo-google-fonts/bricolage-grotesque";

const API_URL = "https://swiftplate-platform.vercel.app";
const DEMO = { email: "customer@swiftplate.test", password: "password123", name: "Chidi" };
const DELIVERY_FEE_KOBO = 100000; // shown only; the server works out the real total

// ---------- look ----------
const C = {
  cream: "#fbf4ea", card: "#ffffff", soft: "#f4ebdd", ink: "#1e1713", muted: "#6e6158", line: "#eadccb",
  tomato: "#c2361f", bright: "#e8452e", tomatoSoft: "#fce3dc", pepper: "#1b6e45", pepperSoft: "#e1f1e7",
  yolk: "#f5b83d", yolkSoft: "#fdf0d2"
};
const F = {
  regular: "BricolageGrotesque_400Regular", medium: "BricolageGrotesque_500Medium",
  semi: "BricolageGrotesque_600SemiBold", bold: "BricolageGrotesque_700Bold", black: "BricolageGrotesque_800ExtraBold"
};

// ---------- food, money, steps (the same as the website's lib/food.js) ----------
const naira = (kobo) => "₦" + Math.round(Number(kobo) / 100).toLocaleString("en-NG");
const PHOTOS = {
  jollof: "1604329760661-e71dc83f8f26", soup: "1547592180-85f173990554", grill: "1529193591184-b1d58069ecdd",
  drink: "1437418747212-8d9709afab22", spread: "1504674900247-0877df9cc836"
};
const unsplash = (id, w) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;
function dishKind(name = "") {
  const n = name.toLowerCase();
  if (/jollof|rice/.test(n)) return "jollof";
  if (/egusi|soup|yam|efo|okra|ogbono|swallow/.test(n)) return "soup";
  if (/suya|wrap|grill|chicken|kebab|asun/.test(n)) return "grill";
  if (/chapman|drink|zobo|juice|cl\)|smoothie/.test(n)) return "drink";
  return "spread";
}
const dishPhoto = (dish, w = 500) => dish?.image_url || unsplash(PHOTOS[dishKind(dish?.name)], w);
const GROUPS = [["jollof", "Rice"], ["soup", "Soups and swallow"], ["grill", "Grills and wraps"], ["spread", "More dishes"], ["drink", "Drinks"]];

const STEPS = [
  { key: "pending", label: "Order placed", note: "Waiting for the kitchen to accept it" },
  { key: "accepted", label: "Accepted", note: "The kitchen has your order" },
  { key: "preparing", label: "Cooking", note: "Your food is being made" },
  { key: "ready", label: "Packed and ready", note: "Finding a rider" },
  { key: "rider_assigned", label: "Rider assigned", note: "A rider is heading to the kitchen" },
  { key: "picked_up", label: "On the way", note: "Your food has left the kitchen" },
  { key: "delivered", label: "Delivered", note: "Enjoy your meal" }
];
const STATUS_LABEL = {
  pending: "Placed", accepted: "Accepted", preparing: "Cooking", ready: "Packed", rider_assigned: "Rider assigned",
  picked_up: "On the way", delivered: "Delivered", cancelled: "Cancelled"
};
const STATUS_COLORS = {
  pending: [C.yolk, C.ink], accepted: [C.tomatoSoft, "#8f2614"], preparing: [C.tomatoSoft, "#8f2614"],
  ready: [C.soft, C.ink], rider_assigned: [C.soft, C.ink], picked_up: [C.pepperSoft, C.pepper],
  delivered: [C.pepper, "#fff"], cancelled: ["#ece7e2", C.muted]
};
const stepIndex = (status) => STEPS.findIndex(s => s.key === status);
const shortId = (id = "") => id.slice(0, 6).toUpperCase();
function lagosTime(d) { // Lagos is UTC+1 all year
  const t = new Date(new Date(d).getTime() + 3600000);
  const h = t.getUTCHours(), m = t.getUTCMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
}
// "3:53am" today, "21 Oct, 3:53am" on another day (Lagos dates)
function lagosWhen(d) {
  const day = (x) => new Date(new Date(x).getTime() + 3600000).toISOString().slice(0, 10);
  if (day(d) === day(Date.now())) return lagosTime(d);
  const t = new Date(new Date(d).getTime() + 3600000);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${t.getUTCDate()} ${months[t.getUTCMonth()]}, ${lagosTime(d)}`;
}
const areaOf = (address = "") => address.split(",").slice(-2, -1)[0]?.trim() || "Lagos";

// ---------- talking to the server ----------
async function call(path, { token, method = "GET", body } = {}) {
  try {
    const res = await fetch(API_URL + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "Can't reach Swiftplate. Check your internet and try again." } };
  }
}

// ============================================================
export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_400Regular, BricolageGrotesque_500Medium, BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold
  });
  if (!fontsLoaded && !fontError) {
    return <View style={[s.fill, s.center, { backgroundColor: C.cream }]}><ActivityIndicator color={C.bright} /></View>;
  }
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  const [session, setSession] = useState(null); // { token, user }
  const [tab, setTab] = useState("home");        // home | order | orders
  const [kitchens, setKitchens] = useState(null);
  const [kitchenError, setKitchenError] = useState("");
  const [openKitchen, setOpenKitchen] = useState(null);
  const [cart, setCart] = useState({ kitchen: null, lines: {} }); // lines: { dishId: { dish, qty } }
  const [address, setAddress] = useState("");
  const [orders, setOrders] = useState(null);
  const [tracking, setTracking] = useState(null); // order id
  const token = session?.token;

  const loadKitchens = useCallback(async () => {
    const r = await call("/api/restaurants");
    if (!r.ok) { setKitchenError(r.data.error || "Couldn't load kitchens."); return; }
    setKitchenError("");
    setKitchens(r.data.restaurants || []);
  }, []);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    const r = await call("/api/orders", { token });
    if (r.status === 401) { setSession(null); return; }
    if (r.ok) setOrders(r.data.orders || []);
  }, [token]);

  useEffect(() => { if (session) loadKitchens(); }, [session, loadKitchens]);
  useEffect(() => {
    if (!session || tab !== "orders" || tracking) return;
    loadOrders();
    const t = setInterval(loadOrders, 5000);
    return () => clearInterval(t);
  }, [session, tab, tracking, loadOrders]);

  const lines = Object.values(cart.lines);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = lines.reduce((n, l) => n + l.dish.price_kobo * l.qty, 0);

  function add(kitchen, dish) {
    const put = () => setCart(c => {
      const same = c.kitchen?.id === kitchen.id;
      const base = same ? c.lines : {};
      return { kitchen: { id: kitchen.id, name: kitchen.name }, lines: { ...base, [dish.id]: { dish, qty: (base[dish.id]?.qty || 0) + 1 } } };
    });
    if (cart.kitchen && cart.kitchen.id !== kitchen.id && count > 0) {
      Alert.alert(
        "Start a new order?",
        `Your order has dishes from ${cart.kitchen.name}. One order comes from one kitchen, so adding this clears it.`,
        [{ text: "Keep my order", style: "cancel" }, { text: "Start new order", style: "destructive", onPress: put }]
      );
      return;
    }
    put();
  }
  function remove(dish) {
    setCart(c => {
      const cur = c.lines[dish.id];
      if (!cur) return c;
      const next = { ...c.lines };
      if (cur.qty <= 1) delete next[dish.id]; else next[dish.id] = { dish, qty: cur.qty - 1 };
      return { kitchen: Object.keys(next).length ? c.kitchen : null, lines: next };
    });
  }

  async function placeOrder() {
    const where = address.trim();
    if (where.length < 8) return { error: "Add a delivery address with the street and area, like 5 Sabo Road, Yaba." };
    const r = await call("/api/orders", {
      token, method: "POST",
      body: { restaurant_id: cart.kitchen.id, items: lines.map(l => ({ menu_item_id: l.dish.id, qty: l.qty })), delivery_address: where }
    });
    if (r.status === 401) { setSession(null); return { error: "Please sign in again." }; }
    if (!r.ok) return { error: r.data.error || "Your order didn't go through. Try again." };
    setCart({ kitchen: null, lines: {} });
    setTab("orders");
    setTracking(r.data.order.id);
    return {};
  }

  function signOut() {
    setSession(null); setTab("home"); setOpenKitchen(null); setTracking(null); setOrders(null);
    setCart({ kitchen: null, lines: {} });
  }

  if (!session) return <SignIn onSignedIn={setSession} />;

  let screen;
  if (tab === "home" && openKitchen) {
    screen = <KitchenScreen kitchen={openKitchen} cart={cart} onAdd={add} onRemove={remove}
      onBack={() => setOpenKitchen(null)} count={count} subtotal={subtotal} onCheckout={() => setTab("order")} />;
  } else if (tab === "home") {
    screen = <HomeScreen user={session.user} kitchens={kitchens} error={kitchenError} onRetry={loadKitchens}
      onOpen={setOpenKitchen} onSignOut={signOut} />;
  } else if (tab === "order") {
    screen = <OrderScreen cart={cart} lines={lines} subtotal={subtotal} address={address} setAddress={setAddress}
      onAdd={(dish) => add(cart.kitchen, dish)} onRemove={remove} onPlace={placeOrder} onBrowse={() => setTab("home")} />;
  } else if (tracking) {
    screen = <TrackScreen orderId={tracking} token={token} onBack={() => { setTracking(null); loadOrders(); }}
      onSignedOut={() => setSession(null)} />;
  } else {
    screen = <OrdersScreen orders={orders} onRefresh={loadOrders} onOpen={setTracking} onBrowse={() => setTab("home")} />;
  }

  return (
    <SafeAreaView style={[s.fill, { backgroundColor: C.cream }]} edges={["top", "left", "right"]}>
      <View style={s.fill}>{screen}</View>
      <TabBar tab={tab} count={count} onChange={(t) => {
        if (t === tab && t === "home") setOpenKitchen(null);
        if (t === tab && t === "orders") setTracking(null);
        setTab(t);
      }} />
    </SafeAreaView>
  );
}

// ============================================================
//  Sign in
// ============================================================
function SignIn({ onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(null); // "demo" | "form"
  const [error, setError] = useState("");

  async function go(kind, creds) {
    if (kind === "form" && (!creds.email.includes("@") || !creds.password)) {
      setError("Enter your email and password."); return;
    }
    setBusy(kind); setError("");
    const r = await call("/api/auth/login", { method: "POST", body: { email: creds.email.trim(), password: creds.password } });
    setBusy(null);
    if (!r.ok) { setError(r.data.error || "Couldn't sign you in."); return; }
    if (r.data.user?.role !== "customer") { setError("This app is for customers. Kitchens, riders and admins have their own screens."); return; }
    onSignedIn({ token: r.data.token, user: r.data.user });
  }

  return (
    <SafeAreaView style={[s.fill, { backgroundColor: C.cream }]}>
      <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.signWrap} keyboardShouldPersistTaps="handled">
          <View style={s.signArt}>
            <Photo uri={unsplash(PHOTOS.jollof, 700)} style={s.signArtA} />
            <Photo uri={unsplash(PHOTOS.grill, 500)} style={s.signArtB} />
            <View style={s.signBadge}>
              <View style={s.liveDot} />
              <View>
                <Text style={s.signBadgeTitle}>On the way</Text>
                <Text style={s.signBadgeText}>Your jollof left the kitchen</Text>
              </View>
            </View>
          </View>

          <Text style={s.logo}>swiftplate<Text style={{ color: C.bright }}>.</Text></Text>
          <Text style={s.display}>Lagos food,{"\n"}hot at your door<Text style={{ color: C.bright }}>.</Text></Text>
          <Text style={s.lead}>Order from kitchens near you, follow every step, and pay the rider when it arrives.</Text>

          <Btn title={`Continue as ${DEMO.name}`} sub="Demo customer, no sign-up needed" busy={busy === "demo"} disabled={!!busy}
            onPress={() => go("demo", DEMO)} style={{ marginTop: 22 }} />

          <Text style={s.or}>or sign in with email</Text>
          <TextInput style={s.input} value={email} onChangeText={(v) => { setEmail(v); setError(""); }}
            placeholder="Email" placeholderTextColor={C.muted} autoCapitalize="none" autoCorrect={false}
            keyboardType="email-address" textContentType="username" />
          <TextInput style={[s.input, { marginTop: 10 }]} value={password} onChangeText={(v) => { setPassword(v); setError(""); }}
            placeholder="Password" placeholderTextColor={C.muted} secureTextEntry textContentType="password"
            onSubmitEditing={() => go("form", { email, password })} />
          {!!error && <Text style={s.error}>{error}</Text>}
          <Btn title="Sign in" kind="ghost" busy={busy === "form"} disabled={!!busy}
            onPress={() => go("form", { email, password })} style={{ marginTop: 12 }} />
          <Text style={s.fine}>This is a demo. No food is delivered and no money is taken.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================
//  Home: the kitchens taking orders
// ============================================================
function HomeScreen({ user, kitchens, error, onRetry, onOpen, onSignOut }) {
  const [refreshing, setRefreshing] = useState(false);
  const first = user?.full_name?.split(" ")[0] || "there";
  return (
    <ScrollView contentContainerStyle={s.page}
      refreshControl={<RefreshControl tintColor={C.muted} refreshing={refreshing}
        onRefresh={async () => { setRefreshing(true); await onRetry(); setRefreshing(false); }} />}>
      <View style={s.topRow}>
        <Text style={s.logoSmall}>swiftplate<Text style={{ color: C.bright }}>.</Text></Text>
        <Pressable onPress={onSignOut} hitSlop={10} accessibilityRole="button">
          <Text style={s.link}>Sign out</Text>
        </Pressable>
      </View>
      <Text style={s.eyebrow}>Hi {first}</Text>
      <Text style={s.title}>What are you{"\n"}eating today?</Text>

      <View style={s.secHead}>
        <Text style={s.h2}>Open now</Text>
        {!!kitchens?.length && (
          <Text style={s.muted}>{naira(DELIVERY_FEE_KOBO)} delivery anywhere in Lagos</Text>
        )}
      </View>

      {kitchens === null && !error && <ActivityIndicator color={C.bright} style={{ marginTop: 30 }} />}
      {!!error && (
        <View style={s.note}>
          <Text style={s.body}>{error}</Text>
          <Btn title="Try again" kind="ink" small onPress={onRetry} style={{ marginTop: 10, alignSelf: "flex-start" }} />
        </View>
      )}
      {kitchens?.length === 0 && (
        <View style={s.note}><Text style={s.body}>No kitchens are taking orders right now. Check back soon.</Text></View>
      )}
      {kitchens?.map(k => <KitchenCard key={k.id} kitchen={k} onPress={() => onOpen(k)} />)}
    </ScrollView>
  );
}

function KitchenCard({ kitchen, onPress }) {
  const cover = kitchen.menu?.[0] ? dishPhoto(kitchen.menu[0], 900) : unsplash(PHOTOS.spread, 900);
  const dishes = kitchen.menu?.length || 0;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.kcard, pressed && s.pressed]} accessibilityRole="button">
      <View>
        <Photo uri={cover} style={s.kcardImg} />
        <View style={[s.chip, s.chipOnPhoto]}><View style={s.openDot} /><Text style={[s.chipText, { color: C.pepper }]}>Open now</Text></View>
      </View>
      <View style={s.kcardBody}>
        <Text style={s.h3}>{kitchen.name}</Text>
        {!!kitchen.description && <Text style={s.muted}>{kitchen.description}</Text>}
        <Text style={s.meta}>{areaOf(kitchen.address)}   ·   {dishes} {dishes === 1 ? "dish" : "dishes"}</Text>
      </View>
    </Pressable>
  );
}

// ============================================================
//  One kitchen's menu
// ============================================================
function KitchenScreen({ kitchen, cart, onAdd, onRemove, onBack, count, subtotal, onCheckout }) {
  const groups = useMemo(() => GROUPS
    .map(([kind, label]) => ({ label, dishes: (kitchen.menu || []).filter(d => dishKind(d.name) === kind) }))
    .filter(g => g.dishes.length), [kitchen]);
  const cover = kitchen.menu?.[0] ? dishPhoto(kitchen.menu[0], 1000) : unsplash(PHOTOS.spread, 1000);
  const mine = cart.kitchen?.id === kitchen.id;

  return (
    <View style={s.fill}>
      <ScrollView contentContainerStyle={{ paddingBottom: count && mine ? 110 : 40 }}>
        <View>
          <Photo uri={cover} style={s.menuCover} />
          <Pressable onPress={onBack} style={s.backBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back to kitchens">
            <Ionicons name="chevron-back" size={22} color={C.ink} />
          </Pressable>
        </View>
        <View style={s.menuHead}>
          <View style={[s.chip, { backgroundColor: C.pepperSoft, alignSelf: "flex-start" }]}>
            <View style={s.openDot} /><Text style={[s.chipText, { color: C.pepper }]}>Open now</Text>
          </View>
          <Text style={s.title}>{kitchen.name}</Text>
          {!!kitchen.description && <Text style={s.lead}>{kitchen.description}</Text>}
          <Text style={s.meta}>{kitchen.address}</Text>
          <Text style={s.meta}>{naira(DELIVERY_FEE_KOBO)} delivery · pay the rider when it arrives</Text>
        </View>

        {groups.map(g => (
          <View key={g.label} style={s.group}>
            <Text style={s.h2}>{g.label}</Text>
            {g.dishes.map(d => (
              <MenuItem key={d.id} dish={d} qty={mine ? cart.lines[d.id]?.qty || 0 : 0}
                onAdd={() => onAdd(kitchen, d)} onRemove={() => onRemove(d)} />
            ))}
          </View>
        ))}
        {groups.length === 0 && <View style={[s.note, { marginHorizontal: 20 }]}><Text style={s.body}>This kitchen hasn't added any dishes yet.</Text></View>}
      </ScrollView>

      {count > 0 && mine && (
        <Pressable onPress={onCheckout} style={({ pressed }) => [s.cartBar, pressed && s.pressed]} accessibilityRole="button">
          <View style={s.cartCount}><Text style={s.cartCountText}>{count}</Text></View>
          <Text style={s.cartBarText}>View your order</Text>
          <Text style={s.cartBarText}>{naira(subtotal)}</Text>
        </Pressable>
      )}
    </View>
  );
}

function MenuItem({ dish, qty, onAdd, onRemove }) {
  return (
    <View style={s.mitem}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.h4}>{dish.name}</Text>
        {!!dish.description && <Text style={s.muted} numberOfLines={2}>{dish.description}</Text>}
        <Text style={s.price}>{naira(dish.price_kobo)}</Text>
      </View>
      <View>
        <Photo uri={dishPhoto(dish, 300)} style={s.mitemImg} />
        <View style={s.stepperOnPhoto}>
          <Stepper qty={qty} onAdd={onAdd} onRemove={onRemove} name={dish.name} />
        </View>
      </View>
    </View>
  );
}

function Stepper({ qty, onAdd, onRemove, name }) {
  if (!qty) {
    return (
      <Pressable onPress={onAdd} style={({ pressed }) => [s.addBtn, pressed && s.pressed]} hitSlop={6}
        accessibilityRole="button" accessibilityLabel={`Add ${name}`}>
        <Ionicons name="add" size={22} color="#fff" />
      </Pressable>
    );
  }
  return (
    <View style={s.stepper}>
      <Pressable onPress={onRemove} style={s.stepBtn} hitSlop={6} accessibilityRole="button" accessibilityLabel={`One less ${name}`}>
        <Ionicons name={qty === 1 ? "trash-outline" : "remove"} size={17} color={C.ink} />
      </Pressable>
      <Text style={s.stepQty}>{qty}</Text>
      <Pressable onPress={onAdd} style={s.stepBtn} hitSlop={6} accessibilityRole="button" accessibilityLabel={`One more ${name}`}>
        <Ionicons name="add" size={18} color={C.ink} />
      </Pressable>
    </View>
  );
}

// ============================================================
//  Your order (checkout)
// ============================================================
function OrderScreen({ cart, lines, subtotal, address, setAddress, onAdd, onRemove, onPlace, onBrowse }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!lines.length) {
    return (
      <View style={[s.fill, s.center, { padding: 28 }]}>
        <Ionicons name="bag-handle-outline" size={44} color={C.muted} />
        <Text style={[s.h2, { marginTop: 12, textAlign: "center" }]}>Your order is empty</Text>
        <Text style={[s.muted, { textAlign: "center", marginTop: 4 }]}>Pick a kitchen and tap + on what you fancy.</Text>
        <Btn title="See what's cooking" onPress={onBrowse} style={{ marginTop: 18 }} />
      </View>
    );
  }

  async function place() {
    setBusy(true); setError("");
    const r = await onPlace();
    setBusy(false);
    if (r?.error) setError(r.error);
  }

  return (
    <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        <Text style={s.eyebrow}>From {cart.kitchen?.name}</Text>
        <Text style={s.title}>Your order</Text>

        <View style={[s.card, { marginTop: 16 }]}>
          {lines.map(({ dish, qty }) => (
            <View key={dish.id} style={s.line}>
              <Photo uri={dishPhoto(dish, 160)} style={s.lineImg} />
              <View style={{ flex: 1 }}>
                <Text style={s.h4}>{dish.name}</Text>
                <Text style={s.muted}>{naira(dish.price_kobo)} each</Text>
              </View>
              <Stepper qty={qty} name={dish.name} onAdd={() => onAdd(dish)} onRemove={() => onRemove(dish)} />
            </View>
          ))}
        </View>

        <Text style={[s.h3, { marginTop: 22 }]}>Deliver to</Text>
        <TextInput style={[s.input, { marginTop: 8 }]} value={address} maxLength={200}
          onChangeText={(v) => { setAddress(v); setError(""); }} placeholder="5 Sabo Road, Yaba, Lagos"
          placeholderTextColor={C.muted} textContentType="fullStreetAddress" />

        <View style={[s.card, { marginTop: 18 }]}>
          <SumRow label="Food" value={naira(subtotal)} />
          <SumRow label="Delivery" value={naira(DELIVERY_FEE_KOBO)} />
          <View style={s.rule} />
          <SumRow label="Total" value={naira(subtotal + DELIVERY_FEE_KOBO)} strong />
        </View>
        <View style={[s.note, { marginTop: 14 }]}>
          <Text style={s.body}>Pay the rider when your food arrives, by cash or transfer.</Text>
        </View>

        {!!error && <Text style={s.error}>{error}</Text>}
        <Btn title={busy ? "Sending your order..." : `Place order, ${naira(subtotal + DELIVERY_FEE_KOBO)}`}
          busy={busy} disabled={busy} onPress={place} style={{ marginTop: 16 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SumRow({ label, value, strong }) {
  return (
    <View style={s.sumRow}>
      <Text style={strong ? s.h4 : s.muted}>{label}</Text>
      <Text style={strong ? s.h4 : s.body}>{value}</Text>
    </View>
  );
}

// ============================================================
//  Your orders, and one order step by step
// ============================================================
function OrdersScreen({ orders, onRefresh, onOpen, onBrowse }) {
  const [refreshing, setRefreshing] = useState(false);
  return (
    <FlatList
      contentContainerStyle={s.page}
      data={orders || []}
      keyExtractor={o => o.id}
      refreshControl={<RefreshControl tintColor={C.muted} refreshing={refreshing}
        onRefresh={async () => { setRefreshing(true); await onRefresh(); setRefreshing(false); }} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 14 }}>
          <Text style={s.title}>Your orders</Text>
          <View style={s.liveRow}><View style={s.liveDot} /><Text style={s.muted}>Updates by itself</Text></View>
        </View>
      }
      ListEmptyComponent={orders === null ? <ActivityIndicator color={C.bright} style={{ marginTop: 30 }} /> : (
        <View style={s.note}>
          <Text style={s.body}>No orders yet. When you order, you can follow it here, step by step.</Text>
          <Btn title="See what's cooking" small onPress={onBrowse} style={{ marginTop: 10, alignSelf: "flex-start" }} />
        </View>
      )}
      renderItem={({ item: o }) => {
        const now = stepIndex(o.status);
        const moving = !["delivered", "cancelled"].includes(o.status);
        return (
          <Pressable onPress={() => onOpen(o.id)} style={({ pressed }) => [s.card, s.orderRow, pressed && s.pressed]} accessibilityRole="button">
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={s.h4}>{o.restaurant_name}</Text>
              <Status status={o.status} />
            </View>
            <Text style={s.muted}>#{shortId(o.id)} · {lagosWhen(o.created_at)} · {naira(o.total_kobo)}</Text>
            {moving && (
              <View style={s.bar}>
                {STEPS.map((st, i) => <View key={st.key} style={[s.barSeg, i <= now && s.barOn]} />)}
              </View>
            )}
          </Pressable>
        );
      }}
    />
  );
}

function TrackScreen({ orderId, token, onBack, onSignedOut }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [askCancel, setAskCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const finished = useRef(false);
  const signedOut = useRef(onSignedOut);
  signedOut.current = onSignedOut;

  const load = useCallback(async () => {
    const r = await call(`/api/orders/${orderId}`, { token });
    if (r.status === 401) { signedOut.current(); return; }
    if (!r.ok) { setError(r.data.error || "Couldn't load this order."); return; }
    setError("");
    setData(r.data);
    finished.current = ["delivered", "cancelled"].includes(r.data.order.status);
  }, [orderId, token]);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (!finished.current) load(); }, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function cancel() {
    setCancelling(true);
    const r = await call(`/api/orders/${orderId}/transition`, { token, method: "POST", body: { action: "cancel", reason: "Cancelled by customer" } });
    setCancelling(false); setAskCancel(false);
    if (!r.ok) setError(r.data.error || "Couldn't cancel. Try again.");
    load();
  }

  if (!data) {
    return (
      <View style={[s.fill, s.center]}>
        {error ? <Text style={s.error}>{error}</Text> : <ActivityIndicator color={C.bright} />}
      </View>
    );
  }

  const { order, items = [], history = [] } = data;
  const cancelled = order.status === "cancelled";
  const now = stepIndex(order.status);
  const step = STEPS[now] || STEPS[0];
  const when = {};
  for (const h of history) if (!when[h.status]) when[h.status] = h.created_at;
  const moving = !cancelled && order.status !== "delivered";

  return (
    <ScrollView contentContainerStyle={s.page}>
      <Pressable onPress={onBack} style={s.backLink} hitSlop={8} accessibilityRole="button">
        <Ionicons name="chevron-back" size={18} color={C.ink} /><Text style={s.link}>Your orders</Text>
      </Pressable>

      <View style={s.card}>
        <Text style={s.eyebrow}>Order #{shortId(order.id)} from {order.restaurant_name}</Text>
        <Text style={s.title}>{cancelled ? "Cancelled" : step.label}</Text>
        <Text style={s.muted}>{cancelled ? (order.cancel_reason || "This order was cancelled.") : step.note}</Text>
        {!cancelled && (
          <View style={s.bar}>
            {STEPS.map((st, i) => <View key={st.key} style={[s.barSeg, (i <= now || order.status === "delivered") && s.barOn]} />)}
          </View>
        )}
        {moving && <View style={s.liveRow}><View style={s.liveDot} /><Text style={s.muted}>Updates by itself</Text></View>}
      </View>

      <View style={[s.card, { marginTop: 14 }]}>
        <Text style={s.h3}>Every step</Text>
        <View style={{ marginTop: 6 }}>
          {STEPS.map((st, i) => {
            const done = !cancelled && (i < now || order.status === "delivered");
            const current = !cancelled && !done && i === now;
            return (
              <View key={st.key} style={s.tl}>
                <View style={s.tlLeft}>
                  <View style={[s.tlDot, done && s.tlDone, current && s.tlNow]}>
                    {done && <Ionicons name="checkmark" size={14} color="#fff" />}
                    {current && <View style={s.tlNowInner} />}
                  </View>
                  {i < STEPS.length - 1 && <View style={[s.tlLine, done && { backgroundColor: C.pepper }]} />}
                </View>
                <View style={{ flex: 1, paddingBottom: 16 }}>
                  <Text style={done || current ? s.h4 : [s.body, { color: C.muted }]}>{st.label}</Text>
                  {current && <Text style={s.muted}>{st.note}</Text>}
                </View>
                <Text style={s.meta}>{when[st.key] ? lagosTime(when[st.key]) : ""}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={[s.card, { marginTop: 14 }]}>
        <Text style={s.h3}>Your order</Text>
        {items.map((it, i) => (
          <SumRow key={i} label={`${it.quantity} × ${it.item_name}`} value={naira(it.unit_price_kobo * it.quantity)} />
        ))}
        <View style={s.rule} />
        <SumRow label="Food" value={naira(order.subtotal_kobo)} />
        <SumRow label="Delivery" value={naira(order.delivery_fee_kobo)} />
        <SumRow label="Total" value={naira(order.total_kobo)} strong />
        <Text style={[s.body, { marginTop: 10 }]}><Text style={s.muted}>To: </Text>{order.delivery_address}</Text>
        <Text style={s.muted}>Pay the rider on delivery.</Text>
        {!!error && <Text style={s.error}>{error}</Text>}

        {order.status === "pending" && !askCancel && (
          <Btn title="Cancel order" kind="ghost" onPress={() => setAskCancel(true)} style={{ marginTop: 12 }} />
        )}
        {order.status === "pending" && askCancel && (
          <View style={[s.note, { marginTop: 12 }]}>
            <Text style={s.h4}>Cancel this order?</Text>
            <Text style={s.body}>You can only cancel before the kitchen accepts it.</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <Btn title={cancelling ? "Cancelling..." : "Yes, cancel it"} small busy={cancelling} disabled={cancelling} onPress={cancel} />
              <Btn title="Keep it" small kind="ghost" disabled={cancelling} onPress={() => setAskCancel(false)} />
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Status({ status }) {
  const [bg, fg] = STATUS_COLORS[status] || [C.soft, C.ink];
  return <View style={[s.chip, { backgroundColor: bg }]}><Text style={[s.chipText, { color: fg }]}>{STATUS_LABEL[status] || status}</Text></View>;
}

// ============================================================
//  Small parts
// ============================================================
function TabBar({ tab, count, onChange }) {
  const items = [
    { key: "home", label: "Kitchens", icon: "restaurant" },
    { key: "order", label: "Your order", icon: "bag-handle", badge: count },
    { key: "orders", label: "Orders", icon: "receipt" }
  ];
  return (
    <SafeAreaView edges={["bottom"]} style={s.tabbar}>
      {items.map(it => {
        const on = tab === it.key;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} style={s.tabBtn} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <View>
              <Ionicons name={on ? it.icon : `${it.icon}-outline`} size={23} color={on ? C.ink : C.muted} />
              {!!it.badge && <View style={s.badge}><Text style={s.badgeText}>{it.badge}</Text></View>}
            </View>
            <Text style={[s.tabText, on && { color: C.ink, fontFamily: F.semi }]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </SafeAreaView>
  );
}

function Btn({ title, sub, onPress, kind = "primary", small, busy, disabled, style }) {
  const bg = kind === "primary" ? C.bright : kind === "ink" ? C.ink : "transparent";
  const fg = kind === "ghost" ? C.ink : "#fff";
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={({ pressed }) => [s.btn, small && s.btnSmall, { backgroundColor: bg },
        kind === "ghost" && { borderWidth: 1.5, borderColor: C.ink }, disabled && !busy && { opacity: 0.45 }, pressed && s.pressed, style]}>
      {busy ? <ActivityIndicator color={fg} /> : (
        <View style={{ alignItems: "center" }}>
          <Text style={[s.btnText, small && { fontSize: 14 }, { color: fg }]}>{title}</Text>
          {!!sub && <Text style={[s.btnSub, { color: fg }]}>{sub}</Text>}
        </View>
      )}
    </Pressable>
  );
}

function Photo({ uri, style }) {
  const [failed, setFailed] = useState(false);
  if (failed || !uri) {
    return <View style={[style, s.photoFallback]}><Ionicons name="restaurant-outline" size={26} color={C.muted} /></View>;
  }
  return <Image source={{ uri }} style={[style, { backgroundColor: C.soft }]} onError={() => setFailed(true)} resizeMode="cover" />;
}

// ============================================================
const s = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  page: { padding: 20, paddingBottom: 40 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },

  logo: { fontFamily: F.black, fontSize: 22, color: C.ink, marginTop: 26, letterSpacing: -0.5 },
  logoSmall: { fontFamily: F.black, fontSize: 19, color: C.ink, letterSpacing: -0.4 },
  display: { fontFamily: F.black, fontSize: 44, lineHeight: 44, color: C.ink, marginTop: 10, letterSpacing: -1.6 },
  title: { fontFamily: F.bold, fontSize: 31, lineHeight: 33, color: C.ink, letterSpacing: -1, marginTop: 4 },
  h2: { fontFamily: F.bold, fontSize: 22, color: C.ink, letterSpacing: -0.5 },
  h3: { fontFamily: F.bold, fontSize: 18, color: C.ink, letterSpacing: -0.3 },
  h4: { fontFamily: F.semi, fontSize: 16, color: C.ink },
  lead: { fontFamily: F.regular, fontSize: 16.5, lineHeight: 24, color: C.muted, marginTop: 10 },
  body: { fontFamily: F.regular, fontSize: 15, lineHeight: 21, color: C.ink },
  muted: { fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.muted },
  meta: { fontFamily: F.regular, fontSize: 13.5, color: C.muted, marginTop: 2 },
  eyebrow: { fontFamily: F.semi, fontSize: 13.5, color: C.tomato, marginTop: 6 },
  link: { fontFamily: F.semi, fontSize: 14.5, color: C.ink, textDecorationLine: "underline" },
  price: { fontFamily: F.bold, fontSize: 16, color: C.ink, marginTop: 4 },
  error: { fontFamily: F.medium, fontSize: 14, color: C.tomato, marginTop: 10 },
  fine: { fontFamily: F.regular, fontSize: 12.5, color: C.muted, textAlign: "center", marginTop: 18 },
  or: { fontFamily: F.medium, fontSize: 13.5, color: C.muted, textAlign: "center", marginTop: 22, marginBottom: 10 },

  signWrap: { padding: 22, paddingBottom: 36 },
  signArt: { height: 230, marginTop: 6 },
  signArtA: { position: "absolute", left: 0, top: 0, width: "68%", height: 200, borderRadius: 26 },
  signArtB: { position: "absolute", right: 0, top: 46, width: "42%", height: 150, borderRadius: 22, borderWidth: 4, borderColor: C.cream },
  signBadge: {
    position: "absolute", left: 16, bottom: 0, flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.card, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14,
    shadowColor: "#3c1e0a", shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4
  },
  signBadgeTitle: { fontFamily: F.semi, fontSize: 14, color: C.ink },
  signBadgeText: { fontFamily: F.regular, fontSize: 12.5, color: C.muted },

  input: {
    fontFamily: F.regular, fontSize: 16, color: C.ink, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line,
    borderRadius: 14, paddingHorizontal: 15, paddingVertical: Platform.OS === "ios" ? 14 : 11
  },
  btn: { minHeight: 54, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 22, paddingVertical: 8 },
  btnSmall: { minHeight: 40, paddingHorizontal: 16, paddingVertical: 6 },
  btnText: { fontFamily: F.semi, fontSize: 16 },
  btnSub: { fontFamily: F.regular, fontSize: 12.5, opacity: 0.85, marginTop: 1 },

  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  secHead: { marginTop: 22, marginBottom: 12, gap: 2 },
  note: { backgroundColor: C.yolkSoft, borderRadius: 16, padding: 14 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 18, gap: 6 },

  chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 28, paddingHorizontal: 11, borderRadius: 999, backgroundColor: C.soft },
  chipText: { fontFamily: F.semi, fontSize: 12.5, color: C.ink },
  chipOnPhoto: { position: "absolute", left: 12, top: 12, backgroundColor: C.card },
  openDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.pepper },

  kcard: { backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.line, overflow: "hidden", marginBottom: 16 },
  kcardImg: { width: "100%", aspectRatio: 16 / 9 },
  kcardBody: { padding: 16, paddingTop: 14, gap: 4 },

  menuCover: { width: "100%", height: 220 },
  backBtn: {
    position: "absolute", left: 16, top: 14, width: 42, height: 42, borderRadius: 21, backgroundColor: C.card,
    alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, elevation: 3
  },
  menuHead: { padding: 20, paddingBottom: 6, gap: 4 },
  group: { paddingHorizontal: 20, marginTop: 18, gap: 10 },
  mitem: { flexDirection: "row", gap: 14, padding: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 20 },
  mitemImg: { width: 108, height: 108, borderRadius: 16 },
  stepperOnPhoto: { position: "absolute", right: 6, bottom: 6 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.bright, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4
  },
  stepper: {
    flexDirection: "row", alignItems: "center", height: 38, borderRadius: 999, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.line, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, elevation: 3
  },
  stepBtn: { width: 34, height: 38, alignItems: "center", justifyContent: "center" },
  stepQty: { fontFamily: F.bold, fontSize: 15, color: C.ink, minWidth: 16, textAlign: "center" },

  cartBar: {
    position: "absolute", left: 16, right: 16, bottom: 14, height: 58, borderRadius: 999, backgroundColor: C.ink,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 10, paddingRight: 22,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6
  },
  cartCount: { minWidth: 38, height: 38, borderRadius: 19, backgroundColor: C.bright, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  cartCountText: { fontFamily: F.bold, color: "#fff", fontSize: 15 },
  cartBarText: { fontFamily: F.semi, color: "#fff", fontSize: 16 },

  line: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  lineImg: { width: 54, height: 54, borderRadius: 12 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 4 },
  rule: { height: 1, backgroundColor: C.line, marginVertical: 8 },

  orderRow: { marginBottom: 12 },
  bar: { flexDirection: "row", gap: 4, marginTop: 8 },
  barSeg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: C.line },
  barOn: { backgroundColor: C.bright },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.pepper },
  backLink: { flexDirection: "row", alignItems: "center", gap: 2, marginBottom: 12 },

  tl: { flexDirection: "row", gap: 12 },
  tlLeft: { alignItems: "center", width: 28 },
  tlDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: C.line, backgroundColor: C.card, alignItems: "center", justifyContent: "center" },
  tlDone: { backgroundColor: C.pepper, borderColor: C.pepper },
  tlNow: { borderColor: C.bright, backgroundColor: C.tomatoSoft },
  tlNowInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.bright },
  tlLine: { flex: 1, width: 2, backgroundColor: C.line, marginTop: 2 },

  photoFallback: { backgroundColor: C.soft, alignItems: "center", justifyContent: "center" },

  tabbar: { flexDirection: "row", backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 },
  tabBtn: { flex: 1, alignItems: "center", gap: 3, paddingBottom: 6 },
  tabText: { fontFamily: F.medium, fontSize: 12, color: C.muted },
  badge: { position: "absolute", top: -5, right: -11, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.bright, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { fontFamily: F.bold, color: "#fff", fontSize: 11 }
});
