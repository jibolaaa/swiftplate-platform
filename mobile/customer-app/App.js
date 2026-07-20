// ============================================================
//  SWIFTPLATE · CUSTOMER APP  (React Native, runs in Expo Go)
//  Paste this whole file into App.js at snack.expo.dev
//
//  ONE LINE TO CHANGE: set API_URL to your live Swiftplate URL.
// ============================================================
import React, { useEffect, useState, useCallback } from "react";
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, StyleSheet, ScrollView, RefreshControl
} from "react-native";

const API_URL = "https://swiftplate-platform.vercel.app"; // live backend

const BRAND = "#e8452e";
const naira = (kobo) => "\u20A6" + (Number(kobo) / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 });

const STATUS = {
  pending: { label: "Waiting for restaurant", color: "#b45f06", bg: "#fff3e6" },
  accepted: { label: "Accepted", color: "#1a56db", bg: "#e8f0fe" },
  preparing: { label: "Preparing your food", color: "#1a56db", bg: "#e8f0fe" },
  ready: { label: "Ready, finding rider", color: "#6d28d9", bg: "#ede9fe" },
  rider_assigned: { label: "Rider on the way", color: "#6d28d9", bg: "#ede9fe" },
  picked_up: { label: "Out for delivery", color: "#6d28d9", bg: "#ede9fe" },
  delivered: { label: "Delivered", color: "#0a8f4e", bg: "#e6f6ec" },
  cancelled: { label: "Cancelled", color: "#c0392b", bg: "#fdeaea" }
};

export default function App() {
  const [screen, setScreen] = useState("login"); // login | shop | cart | orders
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("customer@swiftplate.test");
  const [password, setPassword] = useState("password123");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [restaurants, setRestaurants] = useState([]);
  const [active, setActive] = useState(null); // selected restaurant
  const [cart, setCart] = useState({});       // { menu_item_id: { item, qty } }
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

  // ---------- auth ----------
  const login = async () => {
    setBusy(true); setError("");
    const { ok, data } = await api("/api/auth/login", {
      method: "POST", body: JSON.stringify({ email, password })
    });
    setBusy(false);
    if (!ok) return setError(data.error || "Login failed");
    if (data.user.role !== "customer") return setError("This app is for customers. Use a customer account.");
    setToken(data.token); setUser(data.user); setScreen("shop");
  };

  // ---------- shop ----------
  useEffect(() => {
    if (screen !== "shop" || !token) return;
    (async () => {
      const { ok, data } = await api("/api/restaurants");
      if (ok) setRestaurants(data.restaurants || []);
    })();
  }, [screen, token, api]);

  const cartCount = Object.values(cart).reduce((n, c) => n + c.qty, 0);
  const cartTotal = Object.values(cart).reduce((s, c) => s + c.item.price_kobo * c.qty, 0);

  const addItem = (item) =>
    setCart(prev => ({
      ...prev,
      [item.id]: { item, qty: (prev[item.id]?.qty || 0) + 1 }
    }));

  const decItem = (item) =>
    setCart(prev => {
      const cur = prev[item.id];
      if (!cur) return prev;
      const next = { ...prev };
      if (cur.qty <= 1) delete next[item.id];
      else next[item.id] = { item, qty: cur.qty - 1 };
      return next;
    });

  // ---------- checkout ----------
  const placeOrder = async () => {
    // Derive the restaurant from the cart items themselves (the source
    // of truth), not from which screen the user happens to be on.
    const lines = Object.values(cart);
    if (lines.length === 0) return setError("Your cart is empty.");
    const restaurant_id = lines[0].item.restaurant_id;
    if (!restaurant_id) return setError("Cart items are missing restaurant info. Re-add them.");
    if (!address.trim()) return setError("Please enter a delivery address.");
    setBusy(true); setError("");
    const items = lines.map(c => ({ menu_item_id: c.item.id, qty: c.qty }));
    const { ok, data } = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({ restaurant_id, items, delivery_address: address })
    });
    setBusy(false);
    if (!ok) return setError(data.error || "Could not place order");
    setCart({});
    setScreen("orders");
  };

  // ---------- orders (poll every 5s while on screen) ----------
  const loadOrders = useCallback(async () => {
    const { ok, data } = await api("/api/orders");
    if (ok) setOrders(data.orders || []);
  }, [api]);

  useEffect(() => {
    if (screen !== "orders" || !token) return;
    loadOrders();
    const t = setInterval(loadOrders, 5000);
    return () => clearInterval(t);
  }, [screen, token, loadOrders]);

  // ============================ UI ============================

  if (screen === "login") {
    return (
      <SafeAreaView style={st.safe}>
        <View style={[st.wrap, { justifyContent: "center", flex: 1 }]}>
          <Text style={st.logo}>Swiftplate<Text style={{ color: BRAND }}>.</Text></Text>
          <Text style={st.sub}>Food, delivered. Sign in to order.</Text>
          <TextInput style={st.input} value={email} onChangeText={setEmail}
            autoCapitalize="none" keyboardType="email-address" placeholder="Email" />
          <TextInput style={st.input} value={password} onChangeText={setPassword}
            secureTextEntry placeholder="Password" />
          <TouchableOpacity style={st.btn} onPress={login} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.btnTxt}>Sign in</Text>}
          </TouchableOpacity>
          {!!error && <Text style={st.err}>{error}</Text>}
          <Text style={st.hint}>Demo: customer@swiftplate.test / password123</Text>
        </View>
      </SafeAreaView>
    );
  }

  const Header = () => (
    <View style={st.header}>
      <Text style={st.logoSm}>Swiftplate<Text style={{ color: BRAND }}>.</Text></Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Tab label="Shop" on={screen === "shop"} onPress={() => setScreen("shop")} />
        <Tab label={`Cart${cartCount ? ` (${cartCount})` : ""}`} on={screen === "cart"} onPress={() => setScreen("cart")} />
        <Tab label="Orders" on={screen === "orders"} onPress={() => setScreen("orders")} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={st.safe}>
      <Header />
      {!!error && <Text style={st.err}>{error}</Text>}

      {screen === "shop" && (
        <ScrollView contentContainerStyle={st.wrap}>
          {!active ? (
            <>
              <Text style={st.h1}>Restaurants</Text>
              {restaurants.length === 0 && <ActivityIndicator style={{ marginTop: 30 }} color={BRAND} />}
              {restaurants.map(r => (
                <TouchableOpacity key={r.id} style={st.card} onPress={() => setActive(r)}>
                  <Text style={st.cardTitle}>{r.name}</Text>
                  <Text style={st.note}>{r.description}</Text>
                  <Text style={st.dim}>{r.address}</Text>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => setActive(null)}>
                <Text style={st.back}>← All restaurants</Text>
              </TouchableOpacity>
              <Text style={st.h1}>{active.name}</Text>
              {active.menu.map(m => {
                const qty = cart[m.id]?.qty || 0;
                return (
                  <View key={m.id} style={st.card}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.cardTitle}>{m.name}</Text>
                      <Text style={st.note}>{m.description}</Text>
                      <Text style={st.price}>{naira(m.price_kobo)}</Text>
                    </View>
                    <View style={st.stepRow}>
                      {qty > 0 && (
                        <>
                          <TouchableOpacity style={st.step} onPress={() => decItem(m)}><Text style={st.stepTxt}>−</Text></TouchableOpacity>
                          <Text style={st.qty}>{qty}</Text>
                        </>
                      )}
                      <TouchableOpacity style={[st.step, { backgroundColor: BRAND }]} onPress={() => addItem(m)}>
                        <Text style={[st.stepTxt, { color: "#fff" }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              {cartCount > 0 && (
                <TouchableOpacity style={st.btn} onPress={() => setScreen("cart")}>
                  <Text style={st.btnTxt}>View cart · {cartCount} · {naira(cartTotal)}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      )}

      {screen === "cart" && (
        <ScrollView contentContainerStyle={st.wrap}>
          <Text style={st.h1}>Your cart</Text>
          {cartCount === 0 ? (
            <Text style={st.note}>Cart is empty. Add something tasty from Shop.</Text>
          ) : (
            <>
              {Object.values(cart).map(({ item, qty }) => (
                <View key={item.id} style={st.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.cardTitle}>{item.name}</Text>
                    <Text style={st.price}>{naira(item.price_kobo)} × {qty}</Text>
                  </View>
                  <View style={st.stepRow}>
                    <TouchableOpacity style={st.step} onPress={() => decItem(item)}><Text style={st.stepTxt}>−</Text></TouchableOpacity>
                    <Text style={st.qty}>{qty}</Text>
                    <TouchableOpacity style={[st.step, { backgroundColor: BRAND }]} onPress={() => addItem(item)}>
                      <Text style={[st.stepTxt, { color: "#fff" }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <Text style={st.lbl}>Delivery address</Text>
              <TextInput style={st.input} value={address} onChangeText={setAddress} />
              <View style={st.totRow}><Text style={st.note}>Subtotal</Text><Text style={st.cardTitle}>{naira(cartTotal)}</Text></View>
              <View style={st.totRow}><Text style={st.note}>Delivery</Text><Text style={st.note}>{naira(100000)}</Text></View>
              <View style={st.totRow}><Text style={st.cardTitle}>Total</Text><Text style={st.cardTitle}>{naira(cartTotal + 100000)}</Text></View>
              <TouchableOpacity style={st.btn} onPress={placeOrder} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.btnTxt}>Place order</Text>}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      {screen === "orders" && (
        <FlatList
          contentContainerStyle={st.wrap}
          data={orders}
          keyExtractor={o => o.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadOrders(); setRefreshing(false); }} />}
          ListHeaderComponent={<Text style={st.h1}>My orders</Text>}
          ListEmptyComponent={<Text style={st.note}>No orders yet. Your live order status appears here and updates automatically.</Text>}
          renderItem={({ item: o }) => {
            const s = STATUS[o.status] || {};
            return (
              <View style={st.card}>
                <View style={{ flex: 1 }}>
                  <Text style={st.cardTitle}>{o.restaurant_name}</Text>
                  <Text style={st.dim}>#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleTimeString()}</Text>
                  <View style={[st.badge, { backgroundColor: s.bg }]}>
                    <Text style={[st.badgeTxt, { color: s.color }]}>{s.label || o.status}</Text>
                  </View>
                </View>
                <Text style={st.cardTitle}>{naira(o.total_kobo)}</Text>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function Tab({ label, on, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[st.tab, on && st.tabOn]}>
      <Text style={[st.tabTxt, on && { color: "#fff" }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  wrap: { padding: 18, paddingBottom: 60 },
  logo: { fontSize: 38, fontWeight: "900", color: "#101014" },
  logoSm: { fontSize: 20, fontWeight: "900", color: "#101014" },
  sub: { color: "#6a6a75", marginTop: 6, marginBottom: 22 },
  h1: { fontSize: 24, fontWeight: "800", color: "#101014", marginBottom: 12, marginTop: 4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderColor: "#eee" },
  tab: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999, backgroundColor: "#f4f4f6" },
  tabOn: { backgroundColor: "#101014" },
  tabTxt: { fontSize: 12.5, fontWeight: "700", color: "#3a3a44" },
  input: { borderWidth: 1, borderColor: "#e6e6ea", borderRadius: 12, padding: 13, fontSize: 15, marginTop: 8 },
  btn: { backgroundColor: "#101014", borderRadius: 999, padding: 15, alignItems: "center", marginTop: 16 },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 14.5 },
  err: { color: "#c0392b", marginTop: 10, textAlign: "center" },
  hint: { color: "#9a9aa5", fontSize: 12.5, textAlign: "center", marginTop: 14 },
  card: { flexDirection: "row", gap: 12, alignItems: "center", borderWidth: 1, borderColor: "#ececf0", borderRadius: 14, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 15.5, fontWeight: "700", color: "#101014" },
  note: { color: "#6a6a75", fontSize: 13.5, marginTop: 2 },
  dim: { color: "#9a9aa5", fontSize: 12, marginTop: 2 },
  price: { color: "#101014", fontWeight: "700", marginTop: 4 },
  back: { color: BRAND, fontWeight: "700", marginBottom: 8 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  step: { width: 32, height: 32, borderRadius: 999, backgroundColor: "#f1f1f4", alignItems: "center", justifyContent: "center" },
  stepTxt: { fontSize: 17, fontWeight: "700", color: "#101014" },
  qty: { fontWeight: "700", minWidth: 16, textAlign: "center" },
  lbl: { fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: "#9a9aa5", fontWeight: "700", marginTop: 16 },
  totRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  badge: { alignSelf: "flex-start", borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, marginTop: 7 },
  badgeTxt: { fontSize: 11.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }
});
