// ============================================================
//  SWIFTPLATE · RIDER APP  (React Native, Expo Go)
//  Dark theme. Claim available deliveries, pick up, deliver.
//  Paste this whole file into App.js at snack.expo.dev
// ============================================================
import React, { useEffect, useState, useCallback } from "react";
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, StyleSheet, RefreshControl
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "https://swiftplate-platform.vercel.app"; // live backend

const RED = "#e8452e";
const BG = "#101014";
const CARD = "#1a1a21";
const LINE = "#26262e";
const TXT = "#f2f2f5";
const DIM = "#8b8b96";
const GREEN = "#22c07a";
const naira = (kobo) => "\u20A6" + (Number(kobo) / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 });

export default function App() {
  const [screen, setScreen] = useState("login"); // login | work
  const [tab, setTab] = useState("available");   // available | active
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("rider@swiftplate.test");
  const [password, setPassword] = useState("password123");
  const [busy, setBusy] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState("");
  const [available, setAvailable] = useState([]);
  const [active, setActive] = useState([]);
  const [doneCount, setDoneCount] = useState(0);
  const [doneKobo, setDoneKobo] = useState(0);
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
    if (data.user.role !== "rider") return setError("This app is for riders. Use a rider account.");
    setToken(data.token); setUser(data.user); setScreen("work");
  };

  const load = useCallback(async () => {
    const { ok, data } = await api("/api/orders");
    if (ok) {
      setAvailable(data.available || []);
      setActive(data.orders || []);
    }
  }, [api]);

  useEffect(() => {
    if (screen !== "work" || !token) return;
    load();
    const t = setInterval(load, 5000); // heartbeat
    return () => clearInterval(t);
  }, [screen, token, load]);

  const act = async (order, action) => {
    setActingId(order.id); setError("");
    const { ok, data } = await api(`/api/orders/${order.id}/transition`, {
      method: "POST", body: JSON.stringify({ action })
    });
    setActingId(null);
    if (!ok) return setError(data.error || "Action failed");
    if (action === "claim") setTab("active");
    if (action === "deliver") {
      setDoneCount(c => c + 1);
      setDoneKobo(k => k + Number(order.total_kobo));
    }
    load();
  };

  // ======================== LOGIN ========================
  if (screen === "login") {
    return (
      <SafeAreaView style={st.safe}>
        <View style={[st.wrap, { flex: 1, justifyContent: "center" }]}>
          <View style={st.logoBadge}>
            <Ionicons name="bicycle" size={30} color="#fff" />
          </View>
          <Text style={st.logo}>Swiftplate <Text style={{ color: RED }}>Rider</Text></Text>
          <Text style={st.sub}>Deliveries in. Money out. Sign in to ride.</Text>
          <View style={st.inputRow}>
            <Ionicons name="mail-outline" size={18} color={DIM} />
            <TextInput style={st.input} value={email} onChangeText={setEmail}
              autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor={DIM} />
          </View>
          <View style={st.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={DIM} />
            <TextInput style={st.input} value={password} onChangeText={setPassword}
              secureTextEntry placeholder="Password" placeholderTextColor={DIM} />
          </View>
          <TouchableOpacity style={st.cta} onPress={login} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.ctaTxt}>Start riding</Text>}
          </TouchableOpacity>
          {!!error && <Text style={st.err}>{error}</Text>}
          <Text style={st.hint}>Demo: rider@swiftplate.test · password123</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ======================== WORK ========================
  const Stat = ({ icon, value, label }) => (
    <View style={st.stat}>
      <Ionicons name={icon} size={16} color={RED} />
      <Text style={st.statVal}>{value}</Text>
      <Text style={st.statLbl}>{label}</Text>
    </View>
  );

  const AddressRow = ({ icon, color, label, value }) => (
    <View style={st.addr}>
      <Ionicons name={icon} size={15} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={st.addrLbl}>{label}</Text>
        <Text style={st.addrVal}>{value}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={st.safe}>
      <View style={st.header}>
        <View>
          <Text style={st.hello}>Hey {user?.full_name?.split(" ")[0]} 🏍️</Text>
          <Text style={st.online}><View style={st.dot} /> Online · looking for jobs</Text>
        </View>
        <View style={st.statRow}>
          <Stat icon="checkmark-done" value={doneCount} label="Done" />
          <Stat icon="wallet" value={naira(doneKobo)} label="Delivered value" />
        </View>
      </View>

      <View style={st.tabs}>
        <TouchableOpacity style={[st.tabBtn, tab === "available" && st.tabOn]} onPress={() => setTab("available")}>
          <Text style={[st.tabTxt, tab === "available" && st.tabTxtOn]}>
            Available{available.length > 0 ? ` (${available.length})` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.tabBtn, tab === "active" && st.tabOn]} onPress={() => setTab("active")}>
          <Text style={[st.tabTxt, tab === "active" && st.tabTxtOn]}>
            My delivery{active.length > 0 ? ` (${active.length})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {!!error && <Text style={st.err}>{error}</Text>}

      <ScrollView
        contentContainerStyle={st.wrap}
        refreshControl={<RefreshControl tintColor={DIM} refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        {tab === "available" && (
          available.length === 0 ? (
            <View style={st.emptyBox}>
              <Text style={{ fontSize: 40 }}>🛵</Text>
              <Text style={st.dim}>No jobs right now. New deliveries appear here automatically.</Text>
            </View>
          ) : available.map(o => (
            <View key={o.id} style={st.card}>
              <View style={st.cardTop}>
                <Text style={st.cardTitle}>{o.restaurant_name}</Text>
                <Text style={st.pay}>{naira(o.total_kobo)}</Text>
              </View>
              <AddressRow icon="storefront" color={RED} label="PICK UP" value={o.restaurant_address} />
              <AddressRow icon="location" color={GREEN} label="DELIVER TO" value={o.delivery_address} />
              <TouchableOpacity style={st.cta} onPress={() => act(o, "claim")} disabled={actingId === o.id}>
                {actingId === o.id ? <ActivityIndicator color="#fff" /> : <Text style={st.ctaTxt}>Claim this delivery</Text>}
              </TouchableOpacity>
            </View>
          ))
        )}

        {tab === "active" && (
          active.length === 0 ? (
            <View style={st.emptyBox}>
              <Text style={{ fontSize: 40 }}>😴</Text>
              <Text style={st.dim}>No active delivery. Claim one from Available.</Text>
            </View>
          ) : active.map(o => {
            const pickedUp = o.status === "picked_up";
            return (
              <View key={o.id} style={st.card}>
                <View style={st.cardTop}>
                  <Text style={st.cardTitle}>{o.restaurant_name}</Text>
                  <Text style={st.pay}>{naira(o.total_kobo)}</Text>
                </View>
                <View style={[st.stagePill, pickedUp && { backgroundColor: "#123527" }]}>
                  <Text style={[st.stageTxt, pickedUp && { color: GREEN }]}>
                    {pickedUp ? "EN ROUTE TO CUSTOMER" : "HEAD TO RESTAURANT"}
                  </Text>
                </View>
                <AddressRow icon="storefront" color={RED} label="PICK UP" value={o.restaurant_address} />
                <AddressRow icon="location" color={GREEN} label="DELIVER TO" value={o.delivery_address} />
                {!pickedUp ? (
                  <TouchableOpacity style={st.cta} onPress={() => act(o, "pickup")} disabled={actingId === o.id}>
                    {actingId === o.id ? <ActivityIndicator color="#fff" /> : <Text style={st.ctaTxt}>I've picked up the food</Text>}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[st.cta, { backgroundColor: GREEN }]} onPress={() => act(o, "deliver")} disabled={actingId === o.id}>
                    {actingId === o.id ? <ActivityIndicator color="#fff" /> : <Text style={st.ctaTxt}>Delivered ✓</Text>}
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  wrap: { padding: 18, paddingBottom: 50 },
  logoBadge: { width: 62, height: 62, borderRadius: 18, backgroundColor: RED, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  logo: { fontSize: 30, fontWeight: "900", color: TXT },
  sub: { color: DIM, marginTop: 6, marginBottom: 18 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: LINE, backgroundColor: CARD, borderRadius: 14, paddingHorizontal: 14, marginTop: 12 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: TXT },
  cta: { backgroundColor: RED, borderRadius: 999, padding: 15, alignItems: "center", marginTop: 14 },
  ctaTxt: { color: "#fff", fontWeight: "800", fontSize: 14.5 },
  err: { color: "#ff7a68", marginTop: 8, textAlign: "center", paddingHorizontal: 16 },
  hint: { color: DIM, fontSize: 12.5, textAlign: "center", marginTop: 14 },
  dim: { color: DIM, fontSize: 13.5, textAlign: "center", marginTop: 6 },

  header: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14, gap: 12 },
  hello: { color: TXT, fontSize: 20, fontWeight: "800" },
  online: { color: DIM, fontSize: 12.5, marginTop: 3 },
  dot: { width: 7, height: 7, borderRadius: 99, backgroundColor: GREEN, marginRight: 6 },
  statRow: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: CARD, borderWidth: 1, borderColor: LINE, borderRadius: 14, padding: 12 },
  statVal: { color: TXT, fontWeight: "800", fontSize: 14 },
  statLbl: { color: DIM, fontSize: 11.5 },

  tabs: { flexDirection: "row", marginHorizontal: 18, backgroundColor: CARD, borderRadius: 999, padding: 4, borderWidth: 1, borderColor: LINE },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: "center" },
  tabOn: { backgroundColor: RED },
  tabTxt: { color: DIM, fontWeight: "700", fontSize: 13 },
  tabTxtOn: { color: "#fff" },

  card: { backgroundColor: CARD, borderWidth: 1, borderColor: LINE, borderRadius: 18, padding: 16, marginBottom: 14 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardTitle: { color: TXT, fontSize: 16, fontWeight: "800" },
  pay: { color: TXT, fontWeight: "800", fontSize: 15 },
  stagePill: { alignSelf: "flex-start", backgroundColor: "#3a1712", borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, marginBottom: 10 },
  stageTxt: { color: "#ff8a75", fontSize: 10.5, fontWeight: "800", letterSpacing: 1 },
  addr: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 8 },
  addrLbl: { color: DIM, fontSize: 10, letterSpacing: 1.2, fontWeight: "800" },
  addrVal: { color: TXT, fontSize: 13.5, marginTop: 1 },
  emptyBox: { alignItems: "center", gap: 8, paddingVertical: 60, paddingHorizontal: 30 }
});
