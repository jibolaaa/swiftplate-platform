// ============================================================
//  SWIFTPLATE · CUSTOMER APP v2  (React Native, Expo Go)
//  Real food-app UI: bottom tabs, food imagery, order tracker.
//  Paste this whole file into App.js at snack.expo.dev
// ============================================================
import React, { useEffect, useState, useCallback } from "react";
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity, Image,
  FlatList, ActivityIndicator, StyleSheet, ScrollView, RefreshControl
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "https://swiftplate-platform.vercel.app"; // live backend

const RED = "#e8452e";
const INK = "#17171c";
const GREY = "#71717c";
const SOFT = "#f6f4f0";
const naira = (kobo) => "\u20A6" + (Number(kobo) / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 });

// ---- food images: match dish names to photos, with emoji fallback ----
const IMG = {
  jollof: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=500&q=60",
  soup:   "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=500&q=60",
  suya:   "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=500&q=60",
  drink:  "https://images.unsplash.com/photo-1437418747212-8d9709afab22?auto=format&fit=crop&w=500&q=60",
  generic:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=60"
};
const COVER = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=60";

const foodImg = (name = "") => {
  const n = name.toLowerCase();
  if (n.includes("jollof") || n.includes("rice")) return IMG.jollof;
  if (n.includes("egusi") || n.includes("soup") || n.includes("yam")) return IMG.soup;
  if (n.includes("suya") || n.includes("wrap")) return IMG.suya;
  if (n.includes("chapman") || n.includes("drink") || n.includes("cl)")) return IMG.drink;
  return IMG.generic;
};

function FoodImage({ uri, style, emoji = "🍛" }) {
  const [failed, setFailed] = useState(false);
  if (failed) return (
    <View style={[style, { backgroundColor: "#fcebe7", alignItems: "center", justifyContent: "center" }]}>
      <Text style={{ fontSize: 26 }}>{emoji}</Text>
    </View>
  );
  return <Image source={{ uri }} style={style} onError={() => setFailed(true)} />;
}

const STATUS_STEP = { pending: 0, accepted: 1, preparing: 1, ready: 2, rider_assigned: 2, picked_up: 2, delivered: 3 };
const STATUS_TEXT = {
  pending: "Waiting for restaurant", accepted: "Order accepted", preparing: "Preparing your food",
  ready: "Ready · finding rider", rider_assigned: "Rider heading to pickup",
  picked_up: "Out for delivery", delivered: "Delivered · enjoy!", cancelled: "Cancelled"
};

export default function App() {
  const [tab, setTab] = useState("login"); // login | home | cart | orders
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("customer@swiftplate.test");
  const [password, setPassword] = useState("password123");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [restaurants, setRestaurants] = useState([]);
  const [active, setActive] = useState(null);
  const [cart, setCart] = useState({});
  const [address, setAddress] = useState("5 Demo Close, Yaba, Lagos");
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const api = useCallback(async (path, opts = {}) => {
    const res = await fetch(API_URL + path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {})
      }
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }, [token]);

  const login = async () => {
    setBusy(true); setError("");
    const { ok, data } = await api("/api/auth/login", {
      method: "POST", body: JSON.stringify({ email, password })
    });
    setBusy(false);
    if (!ok) return setError(data.error || "Login failed");
    if (data.user.role !== "customer") return setError("This app is for customers.");
    setToken(data.token); setUser(data.user); setTab("home");
  };

  useEffect(() => {
    if (tab !== "home" || !token) return;
    (async () => {
      const { ok, data } = await api("/api/restaurants");
      if (ok) setRestaurants(data.restaurants || []);
    })();
  }, [tab, token, api]);

  const cartLines = Object.values(cart);
  const cartCount = cartLines.reduce((n, c) => n + c.qty, 0);
  const cartTotal = cartLines.reduce((s, c) => s + c.item.price_kobo * c.qty, 0);

  const addItem = (item) => setCart(p => ({ ...p, [item.id]: { item, qty: (p[item.id]?.qty || 0) + 1 } }));
  const decItem = (item) => setCart(p => {
    const cur = p[item.id]; if (!cur) return p;
    const n = { ...p };
    if (cur.qty <= 1) delete n[item.id]; else n[item.id] = { item, qty: cur.qty - 1 };
    return n;
  });

  const placeOrder = async () => {
    if (cartLines.length === 0) return setError("Your cart is empty.");
    const restaurant_id = cartLines[0].item.restaurant_id;
    if (!restaurant_id) return setError("Cart items missing restaurant info. Re-add them.");
    if (!address.trim()) return setError("Please enter a delivery address.");
    setBusy(true); setError("");
    const items = cartLines.map(c => ({ menu_item_id: c.item.id, qty: c.qty }));
    const { ok, data } = await api("/api/orders", {
      method: "POST", body: JSON.stringify({ restaurant_id, items, delivery_address: address })
    });
    setBusy(false);
    if (!ok) return setError(data.error || "Could not place order");
    setCart({}); setError(""); setTab("orders");
  };

  const loadOrders = useCallback(async () => {
    const { ok, data } = await api("/api/orders");
    if (ok) setOrders(data.orders || []);
  }, [api]);

  useEffect(() => {
    if (tab !== "orders" || !token) return;
    loadOrders();
    const t = setInterval(loadOrders, 5000);
    return () => clearInterval(t);
  }, [tab, token, loadOrders]);

  // ========================= LOGIN =========================
  if (tab === "login") {
    return (
      <SafeAreaView style={st.safe}>
        <FoodImage uri={COVER} style={st.loginHero} emoji="🍲" />
        <View style={st.loginCard}>
          <Text style={st.logo}>Swiftplate<Text style={{ color: RED }}>.</Text></Text>
          <Text style={st.sub}>Hot food, at your door. Sign in to order.</Text>
          <View style={st.inputRow}>
            <Ionicons name="mail-outline" size={18} color={GREY} />
            <TextInput style={st.input} value={email} onChangeText={setEmail}
              autoCapitalize="none" keyboardType="email-address" placeholder="Email" />
          </View>
          <View style={st.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={GREY} />
            <TextInput style={st.input} value={password} onChangeText={setPassword}
              secureTextEntry placeholder="Password" />
          </View>
          <TouchableOpacity style={st.cta} onPress={login} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.ctaTxt}>Sign in</Text>}
          </TouchableOpacity>
          {!!error && <Text style={st.err}>{error}</Text>}
          <Text style={st.hint}>Demo: customer@swiftplate.test · password123</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ========================= SCREENS =========================
  const Home = () => (
    <ScrollView contentContainerStyle={st.wrap} showsVerticalScrollIndicator={false}>
      {!active ? (
        <>
          <Text style={st.hello}>Hey {user?.full_name?.split(" ")[0] || "there"} 👋</Text>
          <Text style={st.h1}>What are you{"\n"}craving today?</Text>
          <View style={st.searchBar}>
            <Ionicons name="search" size={17} color={GREY} />
            <Text style={st.searchTxt}>Jollof, suya, soups…</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
            {["🍛 Rice", "🍲 Soups", "🍢 Suya", "🥤 Drinks", "🍗 Grills"].map(c => (
              <View key={c} style={st.chip}><Text style={st.chipTxt}>{c}</Text></View>
            ))}
          </ScrollView>
          <Text style={st.section}>Restaurants near you</Text>
          {restaurants.length === 0 && <ActivityIndicator style={{ marginTop: 30 }} color={RED} />}
          {restaurants.map(r => (
            <TouchableOpacity key={r.id} style={st.restCard} onPress={() => setActive(r)} activeOpacity={0.9}>
              <FoodImage uri={COVER} style={st.restImg} emoji="🍽️" />
              <View style={st.openPill}><Text style={st.openTxt}>OPEN</Text></View>
              <View style={st.restBody}>
                <View style={{ flex: 1 }}>
                  <Text style={st.restName}>{r.name}</Text>
                  <Text style={st.dim}>{r.address}</Text>
                </View>
                <View style={st.rateChip}>
                  <Ionicons name="star" size={12} color="#e8a33d" />
                  <Text style={st.rateTxt}>4.8</Text>
                </View>
              </View>
              <View style={st.metaRow}>
                <Ionicons name="time-outline" size={13} color={GREY} />
                <Text style={st.metaTxt}>25–35 min</Text>
                <Ionicons name="bicycle-outline" size={14} color={GREY} style={{ marginLeft: 12 }} />
                <Text style={st.metaTxt}>{naira(100000)} delivery</Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : (
        <>
          <View style={st.menuHero}>
            <FoodImage uri={COVER} style={st.menuHeroImg} emoji="🍽️" />
            <TouchableOpacity style={st.backBtn} onPress={() => setActive(null)}>
              <Ionicons name="chevron-back" size={20} color={INK} />
            </TouchableOpacity>
          </View>
          <View style={st.menuInfo}>
            <Text style={st.restNameBig}>{active.name}</Text>
            <View style={st.metaRow}>
              <Ionicons name="star" size={13} color="#e8a33d" />
              <Text style={st.metaTxt}>4.8 (200+)</Text>
              <Ionicons name="time-outline" size={13} color={GREY} style={{ marginLeft: 12 }} />
              <Text style={st.metaTxt}>25–35 min</Text>
            </View>
          </View>
          <Text style={st.section}>Menu</Text>
          {active.menu.map(m => {
            const qty = cart[m.id]?.qty || 0;
            return (
              <View key={m.id} style={st.dishCard}>
                <FoodImage uri={foodImg(m.name)} style={st.dishImg} />
                <View style={{ flex: 1 }}>
                  <Text style={st.dishName}>{m.name}</Text>
                  <Text style={st.dim} numberOfLines={1}>{m.description}</Text>
                  <Text style={st.dishPrice}>{naira(m.price_kobo)}</Text>
                </View>
                <View style={st.stepCol}>
                  {qty > 0 && (
                    <TouchableOpacity style={st.stepBtn} onPress={() => decItem(m)}>
                      <Ionicons name="remove" size={16} color={INK} />
                    </TouchableOpacity>
                  )}
                  {qty > 0 && <Text style={st.qty}>{qty}</Text>}
                  <TouchableOpacity style={[st.stepBtn, { backgroundColor: RED }]} onPress={() => addItem(m)}>
                    <Ionicons name="add" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          {cartCount > 0 && (
            <TouchableOpacity style={st.cta} onPress={() => setTab("cart")}>
              <Text style={st.ctaTxt}>View cart · {cartCount} · {naira(cartTotal)}</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );

  const Cart = () => (
    <ScrollView contentContainerStyle={st.wrap}>
      <Text style={st.h1}>Your cart</Text>
      {cartCount === 0 ? (
        <View style={st.emptyBox}>
          <Text style={{ fontSize: 40 }}>🛒</Text>
          <Text style={st.dim}>Nothing here yet. Go find something tasty.</Text>
        </View>
      ) : (
        <>
          {cartLines.map(({ item, qty }) => (
            <View key={item.id} style={st.dishCard}>
              <FoodImage uri={foodImg(item.name)} style={st.dishImg} />
              <View style={{ flex: 1 }}>
                <Text style={st.dishName}>{item.name}</Text>
                <Text style={st.dishPrice}>{naira(item.price_kobo)} × {qty}</Text>
              </View>
              <View style={st.stepCol}>
                <TouchableOpacity style={st.stepBtn} onPress={() => decItem(item)}>
                  <Ionicons name="remove" size={16} color={INK} />
                </TouchableOpacity>
                <Text style={st.qty}>{qty}</Text>
                <TouchableOpacity style={[st.stepBtn, { backgroundColor: RED }]} onPress={() => addItem(item)}>
                  <Ionicons name="add" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={st.addrRow}>
            <Ionicons name="location-outline" size={18} color={RED} />
            <TextInput style={[st.input, { flex: 1 }]} value={address} onChangeText={setAddress} placeholder="Delivery address" />
          </View>
          <View style={st.sumCard}>
            <Row l="Subtotal" r={naira(cartTotal)} />
            <Row l="Delivery" r={naira(100000)} />
            <View style={st.divider} />
            <Row l="Total" r={naira(cartTotal + 100000)} bold />
          </View>
          <TouchableOpacity style={st.cta} onPress={placeOrder} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.ctaTxt}>Place order · {naira(cartTotal + 100000)}</Text>}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );

  const Orders = () => (
    <FlatList
      contentContainerStyle={st.wrap}
      data={orders}
      keyExtractor={o => o.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadOrders(); setRefreshing(false); }} />}
      ListHeaderComponent={<Text style={st.h1}>My orders</Text>}
      ListEmptyComponent={
        <View style={st.emptyBox}>
          <Text style={{ fontSize: 40 }}>🧾</Text>
          <Text style={st.dim}>No orders yet. They'll track live here.</Text>
        </View>
      }
      renderItem={({ item: o }) => {
        const step = STATUS_STEP[o.status] ?? 0;
        const cancelled = o.status === "cancelled";
        const delivered = o.status === "delivered";
        return (
          <View style={st.orderCard}>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <FoodImage uri={IMG.jollof} style={st.orderImg} />
              <View style={{ flex: 1 }}>
                <Text style={st.dishName}>{o.restaurant_name}</Text>
                <Text style={st.dim}>#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleTimeString()}</Text>
              </View>
              <Text style={st.dishName}>{naira(o.total_kobo)}</Text>
            </View>
            {!cancelled ? (
              <>
                <View style={st.track}>
                  {[0, 1, 2, 3].map(i => (
                    <React.Fragment key={i}>
                      <View style={[st.dot, i <= step && st.dotOn]}>
                        {(i < step || (delivered && i === 3)) && <Ionicons name="checkmark" size={10} color="#fff" />}
                      </View>
                      {i < 3 && <View style={[st.line, i < step && st.lineOn]} />}
                    </React.Fragment>
                  ))}
                </View>
                <View style={st.trackLabels}>
                  <Text style={st.trackTxt}>Placed</Text>
                  <Text style={st.trackTxt}>Cooking</Text>
                  <Text style={st.trackTxt}>On the way</Text>
                  <Text style={st.trackTxt}>Delivered</Text>
                </View>
                <Text style={[st.statusLine, delivered && { color: "#0a8f4e" }]}>
                  {STATUS_TEXT[o.status] || o.status}
                </Text>
              </>
            ) : (
              <Text style={[st.statusLine, { color: "#c0392b" }]}>{STATUS_TEXT.cancelled}</Text>
            )}
          </View>
        );
      }}
    />
  );

  return (
    <SafeAreaView style={st.safe}>
      {!!error && <Text style={st.err}>{error}</Text>}
      <View style={{ flex: 1 }}>
        {tab === "home" && <Home />}
        {tab === "cart" && <Cart />}
        {tab === "orders" && <Orders />}
      </View>
      <View style={st.tabbar}>
        <TabBtn icon="home" label="Home" on={tab === "home"} onPress={() => setTab("home")} />
        <TabBtn icon="cart" label="Cart" on={tab === "cart"} onPress={() => setTab("cart")} badge={cartCount} />
        <TabBtn icon="receipt" label="Orders" on={tab === "orders"} onPress={() => setTab("orders")} />
      </View>
    </SafeAreaView>
  );
}

function Row({ l, r, bold }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
      <Text style={bold ? st.dishName : st.dim}>{l}</Text>
      <Text style={bold ? st.dishName : st.dim}>{r}</Text>
    </View>
  );
}

function TabBtn({ icon, label, on, onPress, badge = 0 }) {
  return (
    <TouchableOpacity style={st.tabBtn} onPress={onPress}>
      <View>
        <Ionicons name={on ? icon : `${icon}-outline`} size={22} color={on ? RED : GREY} />
        {badge > 0 && <View style={st.badge}><Text style={st.badgeTxt}>{badge}</Text></View>}
      </View>
      <Text style={[st.tabTxt, on && { color: RED }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  wrap: { padding: 18, paddingBottom: 40 },
  logo: { fontSize: 34, fontWeight: "900", color: INK },
  sub: { color: GREY, marginTop: 4, marginBottom: 18 },
  hello: { color: GREY, fontSize: 15 },
  h1: { fontSize: 26, fontWeight: "800", color: INK, marginTop: 2, marginBottom: 14, lineHeight: 32 },
  section: { fontSize: 17, fontWeight: "800", color: INK, marginTop: 22, marginBottom: 10 },

  loginHero: { width: "100%", height: 240 },
  loginCard: { flex: 1, backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -26, padding: 24 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#e9e9ee", borderRadius: 14, paddingHorizontal: 14, marginTop: 12 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: INK },
  cta: { backgroundColor: RED, borderRadius: 999, padding: 16, alignItems: "center", marginTop: 18, shadowColor: RED, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  ctaTxt: { color: "#fff", fontWeight: "800", fontSize: 15 },
  err: { color: "#c0392b", marginTop: 10, textAlign: "center", paddingHorizontal: 16 },
  hint: { color: "#a5a5af", fontSize: 12.5, textAlign: "center", marginTop: 14 },

  searchBar: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: SOFT, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 13, marginTop: 6 },
  searchTxt: { color: GREY, fontSize: 14.5 },
  chip: { backgroundColor: SOFT, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16, marginRight: 8 },
  chipTxt: { fontSize: 13.5, fontWeight: "600", color: INK },

  restCard: { borderRadius: 20, backgroundColor: "#fff", marginBottom: 18, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  restImg: { width: "100%", height: 150, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  openPill: { position: "absolute", top: 12, left: 12, backgroundColor: "#0a8f4e", borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  openTxt: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  restBody: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 12 },
  restName: { fontSize: 16.5, fontWeight: "800", color: INK },
  restNameBig: { fontSize: 22, fontWeight: "800", color: INK },
  rateChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fdf6e7", borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
  rateTxt: { fontSize: 12.5, fontWeight: "700", color: INK },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 10 },
  metaTxt: { color: GREY, fontSize: 12.5 },

  menuHero: { marginHorizontal: -18, marginTop: -18 },
  menuHeroImg: { width: "100%", height: 190 },
  backBtn: { position: "absolute", top: 14, left: 16, backgroundColor: "#fff", width: 36, height: 36, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  menuInfo: { backgroundColor: "#fff", borderRadius: 18, marginTop: -24, padding: 14, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },

  dishCard: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: "#f0f0f3" },
  dishImg: { width: 62, height: 62, borderRadius: 12 },
  dishName: { fontSize: 15, fontWeight: "700", color: INK },
  dishPrice: { fontSize: 14, fontWeight: "800", color: RED, marginTop: 3 },
  dim: { color: "#a0a0aa", fontSize: 12.5, marginTop: 1 },
  stepCol: { flexDirection: "row", alignItems: "center", gap: 7 },
  stepBtn: { width: 30, height: 30, borderRadius: 999, backgroundColor: SOFT, alignItems: "center", justifyContent: "center" },
  qty: { fontWeight: "800", minWidth: 14, textAlign: "center", color: INK },

  addrRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#e9e9ee", borderRadius: 14, paddingHorizontal: 12, marginTop: 14 },
  sumCard: { backgroundColor: SOFT, borderRadius: 16, padding: 16, marginTop: 16 },
  divider: { height: 1, backgroundColor: "#e4e2dc", marginTop: 10, marginBottom: 2 },
  emptyBox: { alignItems: "center", gap: 8, paddingVertical: 50 },

  orderCard: { backgroundColor: "#fff", borderRadius: 18, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "#f0f0f3", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  orderImg: { width: 46, height: 46, borderRadius: 10 },
  track: { flexDirection: "row", alignItems: "center", marginTop: 16, paddingHorizontal: 4 },
  dot: { width: 18, height: 18, borderRadius: 999, backgroundColor: "#ecebe6", alignItems: "center", justifyContent: "center" },
  dotOn: { backgroundColor: RED },
  line: { flex: 1, height: 3, backgroundColor: "#ecebe6", marginHorizontal: 3, borderRadius: 2 },
  lineOn: { backgroundColor: RED },
  trackLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  trackTxt: { fontSize: 10.5, color: GREY },
  statusLine: { marginTop: 10, fontWeight: "700", color: INK, fontSize: 13.5 },

  tabbar: { flexDirection: "row", borderTopWidth: 1, borderColor: "#efeff2", backgroundColor: "#fff", paddingTop: 8, paddingBottom: 6 },
  tabBtn: { flex: 1, alignItems: "center", gap: 2 },
  tabTxt: { fontSize: 11, color: GREY, fontWeight: "600" },
  badge: { position: "absolute", top: -5, right: -9, backgroundColor: RED, borderRadius: 999, minWidth: 15, height: 15, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeTxt: { color: "#fff", fontSize: 9.5, fontWeight: "800" }
});
