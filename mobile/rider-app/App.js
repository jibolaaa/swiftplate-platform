// ============================================================
//  SWIFTPLATE · RIDER APP  (React Native, Expo)
//  Jobs that are packed and ready, and the one you're on.
//  Taking a job is first come, first served: if another rider
//  gets there first, the server says so (409) and the job goes.
//  Every order is paid online before the kitchen cooks it, so
//  there's no cash to collect. Each step shows a tick when it
//  goes through.
//  To try it: paste this file into App.js at snack.expo.dev and
//  open it in Expo Go. Snack adds the packages it imports.
// ============================================================
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, StyleSheet,
  RefreshControl, KeyboardAvoidingView, Platform, Animated
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import {
  useFonts, BricolageGrotesque_400Regular, BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold
} from "@expo-google-fonts/bricolage-grotesque";

const API_URL = "https://swiftplate-platform.vercel.app";
const DEMO = { email: "rider@swiftplate.test", password: "password123", name: "Rex" };

const C = {
  cream: "#fbf4ea", card: "#ffffff", soft: "#f4ebdd", ink: "#1e1713", muted: "#6e6158", line: "#eadccb",
  tomato: "#c2361f", bright: "#e8452e", tomatoSoft: "#fce3dc", pepper: "#1b6e45", pepperSoft: "#e1f1e7",
  yolk: "#f5b83d", yolkSoft: "#fdf0d2"
};
const F = {
  regular: "BricolageGrotesque_400Regular", medium: "BricolageGrotesque_500Medium",
  semi: "BricolageGrotesque_600SemiBold", bold: "BricolageGrotesque_700Bold", black: "BricolageGrotesque_800ExtraBold"
};

const naira = (kobo) => "₦" + Math.round(Number(kobo) / 100).toLocaleString("en-NG");
const shortId = (id = "") => id.slice(0, 6).toUpperCase();
function lagosTime(d) { // Lagos is UTC+1 all year
  const t = new Date(new Date(d).getTime() + 3600000);
  const h = t.getUTCHours(), m = t.getUTCMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
}
const itemsText = (o) => Array.isArray(o.items) && o.items.length ? o.items.map(i => `${i.qty}× ${i.name}`).join(", ") : "";

// What the rider does next on their own job.
const NEXT = {
  rider_assigned: { action: "pickup", label: "I've picked it up", note: "Head to the kitchen and collect the order.", tag: "Go to the kitchen", done: "Picked up" },
  picked_up: { action: "deliver", label: "Delivered", note: "Take it to the customer. It's already paid.", tag: "On the way", done: "Delivered" }
};

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
  const [session, setSession] = useState(null);
  if (!session) return <SignIn onSignedIn={setSession} />;
  return <Jobs session={session} onSignOut={() => setSession(null)} />;
}

// ============================================================
//  Sign in
// ============================================================
function SignIn({ onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  async function go(kind, creds) {
    if (kind === "form" && (!creds.email.includes("@") || !creds.password)) { setError("Enter your email and password."); return; }
    setBusy(kind); setError("");
    const r = await call("/api/auth/login", { method: "POST", body: { email: creds.email.trim(), password: creds.password } });
    setBusy(null);
    if (!r.ok) { setError(r.data.error || "Couldn't sign you in."); return; }
    if (r.data.user?.role !== "rider") { setError("This app is for riders. Customers, kitchens and admins have their own screens."); return; }
    onSignedIn({ token: r.data.token, user: r.data.user });
  }

  return (
    <SafeAreaView style={[s.fill, { backgroundColor: C.cream }]}>
      <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.signWrap} keyboardShouldPersistTaps="handled">
          <View style={s.signMark}><Ionicons name="bicycle" size={34} color="#fff" /></View>
          <Text style={s.logo}>swiftplate<Text style={{ color: C.bright }}>.</Text> <Text style={s.logoTag}>Rider</Text></Text>
          <Text style={s.display}>Take a job.{"\n"}Deliver it hot<Text style={{ color: C.bright }}>.</Text></Text>
          <Text style={s.lead}>When a kitchen packs an order, it shows up here. Take it, pick it up and drop it off. Every order is paid online first.</Text>

          <View style={s.howList}>
            {[["flash-outline", "First rider to tap gets the job"], ["navigate-outline", "Kitchen and customer address on every job"], ["card-outline", "Paid online, so there's no cash to carry"]].map(([icon, text]) => (
              <View key={text} style={s.howRow}><Ionicons name={icon} size={18} color={C.tomato} /><Text style={s.body}>{text}</Text></View>
            ))}
          </View>

          <Btn title={`Continue as ${DEMO.name}`} sub="Demo rider, no sign-up needed" busy={busy === "demo"} disabled={!!busy}
            onPress={() => go("demo", DEMO)} style={{ marginTop: 22 }} />
          <Text style={s.or}>or sign in with email</Text>
          <TextInput style={s.input} value={email} onChangeText={(v) => { setEmail(v); setError(""); }} placeholder="Email"
            placeholderTextColor={C.muted} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" />
          <TextInput style={[s.input, { marginTop: 10 }]} value={password} onChangeText={(v) => { setPassword(v); setError(""); }}
            placeholder="Password" placeholderTextColor={C.muted} secureTextEntry textContentType="password"
            onSubmitEditing={() => go("form", { email, password })} />
          {!!error && <Text style={s.error}>{error}</Text>}
          <Btn title="Sign in" kind="ghost" busy={busy === "form"} disabled={!!busy} onPress={() => go("form", { email, password })} style={{ marginTop: 12 }} />
          <Text style={s.fine}>This is a demo. Payments run in Paystack test mode, so no real money moves.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================
//  Jobs: your delivery, and the ones ready for pickup
// ============================================================
function Jobs({ session, onSignOut }) {
  const { token, user } = session;
  const [mine, setMine] = useState([]);
  const [open, setOpen] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [done, setDone] = useState({ count: 0, kobo: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [flash, setFlash] = useState(null); // { order, label } while the tick shows
  const signOut = useRef(onSignOut);
  signOut.current = onSignOut;

  const load = useCallback(async () => {
    const r = await call("/api/orders", { token });
    if (r.status === 401) { signOut.current(); return; }
    if (!r.ok) { setError(r.data.error || "Couldn't load jobs."); return; }
    setMine(r.data.orders || []);
    setOpen(r.data.available || []);
    setLoaded(true);
  }, [token]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function act(o, action) {
    setBusyId(o.id); setError("");
    const r = await call(`/api/orders/${o.id}/transition`, { token, method: "POST", body: { action } });
    setBusyId(null);
    if (!r.ok) {
      setError(r.status === 409 && action === "claim" ? "Another rider took that job first." : (r.data.error || "That didn't go through. Try again."));
      load();
      return;
    }
    if (action === "deliver") setDone(d => ({ count: d.count + 1, kobo: d.kobo + Number(o.total_kobo) }));
    setFlash({ order: o, label: action === "claim" ? "The job is yours" : NEXT[o.status].done });
    setTimeout(() => { setFlash(null); load(); }, 1300);
  }

  // While the tick shows, keep the job in the list it was in (and only there).
  function during(list, home) {
    if (!flash) return list;
    const id = flash.order.id;
    if (!home) return list.filter(o => o.id !== id);
    return list.some(o => o.id === id) ? list.map(o => (o.id === id ? flash.order : o)) : [...list, flash.order];
  }
  const wasOpen = flash?.order.status === "ready";
  const mineShown = during(mine, flash && !wasOpen);
  const openShown = during(open, flash && wasOpen);

  const first = user?.full_name?.split(" ")[0] || "there";

  return (
    <SafeAreaView style={[s.fill, { backgroundColor: C.cream }]}>
      <ScrollView contentContainerStyle={s.page}
        refreshControl={<RefreshControl tintColor={C.muted} refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <View style={s.topRow}>
          <Text style={s.logoSmall}>swiftplate<Text style={{ color: C.bright }}>.</Text> <Text style={s.logoTagSmall}>Rider</Text></Text>
          <Pressable onPress={onSignOut} hitSlop={10} accessibilityRole="button"><Text style={s.link}>Sign out</Text></Pressable>
        </View>

        <Text style={s.eyebrow}>Hi {first}</Text>
        <Text style={s.title}>Deliveries</Text>
        <Text style={[s.muted, { marginTop: 4 }]}>Take a job, pick it up, deliver it.</Text>

        <Text style={[s.meta, { marginTop: 16 }]}>Since you signed in</Text>
        <View style={s.stats}>
          <View style={s.stat}><Text style={s.statValue}>{done.count}</Text><Text style={s.muted}>delivered</Text></View>
          <View style={s.stat}><Text style={s.statValue}>{naira(done.kobo)}</Text><Text style={s.muted}>of food delivered</Text></View>
        </View>

        {!!error && <View style={[s.note, { marginTop: 14 }]}><Text style={[s.body, { color: C.tomato }]}>{error}</Text></View>}

        <Text style={[s.h2, { marginTop: 24 }]}>Your delivery</Text>
        {!loaded && <ActivityIndicator color={C.bright} style={{ marginTop: 16 }} />}
        {loaded && mineShown.length === 0 && <Text style={[s.empty, { marginTop: 8 }]}>You're free. Take a job below.</Text>}
        {mineShown.map(o => {
          const next = NEXT[o.status];
          return (
            <View key={o.id} style={[s.job, s.jobMine]}>
              {flash?.order.id === o.id && <DoneFlash label={flash.label} />}
              <View style={s.jobTop}>
                <Text style={s.ticketId}>#{shortId(o.id)}</Text>
                <View style={[s.chip, { backgroundColor: o.status === "picked_up" ? C.pepperSoft : C.yolk }]}>
                  <Text style={[s.chipText, { color: o.status === "picked_up" ? C.pepper : C.ink }]}>{next?.tag || o.status}</Text>
                </View>
              </View>
              <Route o={o} />
              {!!itemsText(o) && <Text style={s.body}>{itemsText(o)}</Text>}
              <View style={s.collect}>
                <Ionicons name="checkmark-circle-outline" size={18} color={C.pepper} />
                <Text style={s.body}><Text style={s.strong}>{naira(o.total_kobo)} order</Text>, paid online</Text>
              </View>
              {!!next && <Text style={s.muted}>{next.note}</Text>}
              {!!next && (
                <Btn title={busyId === o.id ? "Saving..." : next.label} busy={busyId === o.id} disabled={busyId === o.id || !!flash}
                  kind={o.status === "picked_up" ? "green" : "primary"} onPress={() => act(o, next.action)} style={{ marginTop: 6 }} />
              )}
            </View>
          );
        })}

        <View style={[s.secHead, { marginTop: 26 }]}>
          <Text style={s.h2}>Ready for pickup</Text>
          <Text style={[s.h2, { color: C.muted, fontFamily: F.medium }]}>{open.length}</Text>
        </View>
        {loaded && openShown.length === 0 && <Text style={s.empty}>No jobs right now. When a kitchen marks food ready, it shows up here.</Text>}
        {openShown.map(o => (
          <View key={o.id} style={s.job}>
            {flash?.order.id === o.id && <DoneFlash label={flash.label} />}
            <View style={s.jobTop}>
              <Text style={s.ticketId}>#{shortId(o.id)}</Text>
              <Text style={s.meta}>Ready since {lagosTime(o.updated_at || o.created_at)}</Text>
            </View>
            <Route o={o} />
            {!!itemsText(o) && <Text style={s.body}>{itemsText(o)}</Text>}
            <Text style={s.muted}>{naira(o.total_kobo)} order, paid online</Text>
            <Btn title={busyId === o.id ? "Taking it..." : "Take this job"} kind="ink" busy={busyId === o.id}
              disabled={!!busyId || !!flash} onPress={() => act(o, "claim")} style={{ marginTop: 6 }} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// A tick over the job for a moment after a step goes through.
function DoneFlash({ label }) {
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 6, tension: 140, useNativeDriver: Platform.OS !== "web" }).start();
  }, [pop]);
  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  return (
    <View style={s.flash} accessibilityLiveRegion="polite" accessibilityLabel={label}>
      <Animated.View style={[s.flashTick, { opacity: pop, transform: [{ scale }] }]}>
        <Ionicons name="checkmark" size={36} color="#fff" />
      </Animated.View>
      <Animated.Text style={[s.flashText, { opacity: pop }]}>{label}</Animated.Text>
    </View>
  );
}

function Route({ o }) {
  return (
    <View style={s.route}>
      <View style={s.stop}>
        <View style={s.stopRail}><View style={[s.stopDot, { backgroundColor: C.bright }]} /><View style={s.stopLine} /></View>
        <View style={{ flex: 1, paddingBottom: 12 }}>
          <Text style={s.stopLabel}>PICK UP</Text>
          <Text style={s.h4}>{o.restaurant_name}</Text>
          {!!o.restaurant_address && <Text style={s.muted}>{o.restaurant_address}</Text>}
        </View>
      </View>
      <View style={s.stop}>
        <View style={s.stopRail}><View style={[s.stopDot, { backgroundColor: C.pepper }]} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.stopLabel}>DROP OFF</Text>
          <Text style={s.h4}>{o.delivery_address}</Text>
        </View>
      </View>
    </View>
  );
}

function Btn({ title, sub, onPress, kind = "primary", busy, disabled, style }) {
  const bg = { primary: C.bright, ink: C.ink, green: C.pepper, ghost: "transparent" }[kind];
  const fg = kind === "ghost" ? C.ink : "#fff";
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={({ pressed }) => [s.btn, { backgroundColor: bg }, kind === "ghost" && { borderWidth: 1.5, borderColor: C.ink },
        disabled && !busy && { opacity: 0.45 }, pressed && s.pressed, style]}>
      {busy ? <ActivityIndicator color={fg} /> : (
        <View style={{ alignItems: "center" }}>
          <Text style={[s.btnText, { color: fg }]}>{title}</Text>
          {!!sub && <Text style={[s.btnSub, { color: fg }]}>{sub}</Text>}
        </View>
      )}
    </Pressable>
  );
}

// ============================================================
const s = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  page: { padding: 20, paddingBottom: 48 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },

  signWrap: { padding: 22, paddingTop: 34, paddingBottom: 36 },
  signMark: { width: 64, height: 64, borderRadius: 20, backgroundColor: C.bright, alignItems: "center", justifyContent: "center" },
  logo: { fontFamily: F.black, fontSize: 22, color: C.ink, marginTop: 18, letterSpacing: -0.5 },
  logoTag: { fontFamily: F.semi, fontSize: 16, color: C.muted, letterSpacing: 0 },
  logoSmall: { fontFamily: F.black, fontSize: 19, color: C.ink, letterSpacing: -0.4 },
  logoTagSmall: { fontFamily: F.semi, fontSize: 14, color: C.muted, letterSpacing: 0 },
  display: { fontFamily: F.black, fontSize: 42, lineHeight: 43, color: C.ink, marginTop: 10, letterSpacing: -1.5 },
  title: { fontFamily: F.bold, fontSize: 31, lineHeight: 33, color: C.ink, letterSpacing: -1, marginTop: 2 },
  h2: { fontFamily: F.bold, fontSize: 21, color: C.ink, letterSpacing: -0.4 },
  h4: { fontFamily: F.semi, fontSize: 16, color: C.ink },
  lead: { fontFamily: F.regular, fontSize: 16.5, lineHeight: 24, color: C.muted, marginTop: 10 },
  body: { fontFamily: F.regular, fontSize: 15, lineHeight: 21, color: C.ink },
  strong: { fontFamily: F.bold },
  muted: { fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.muted },
  meta: { fontFamily: F.regular, fontSize: 13.5, color: C.muted },
  empty: { fontFamily: F.regular, fontSize: 15, lineHeight: 21, color: C.muted, backgroundColor: C.soft, borderRadius: 16, padding: 14 },
  eyebrow: { fontFamily: F.semi, fontSize: 13.5, color: C.tomato, marginTop: 6 },
  link: { fontFamily: F.semi, fontSize: 14.5, color: C.ink, textDecorationLine: "underline" },
  error: { fontFamily: F.medium, fontSize: 14, color: C.tomato, marginTop: 10 },
  fine: { fontFamily: F.regular, fontSize: 12.5, color: C.muted, textAlign: "center", marginTop: 18 },
  or: { fontFamily: F.medium, fontSize: 13.5, color: C.muted, textAlign: "center", marginTop: 22, marginBottom: 10 },

  howList: { marginTop: 18, gap: 10 },
  howRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  input: {
    fontFamily: F.regular, fontSize: 16, color: C.ink, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line,
    borderRadius: 14, paddingHorizontal: 15, paddingVertical: Platform.OS === "ios" ? 14 : 11
  },
  btn: { minHeight: 54, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 22, paddingVertical: 8 },
  btnText: { fontFamily: F.semi, fontSize: 16 },
  btnSub: { fontFamily: F.regular, fontSize: 12.5, opacity: 0.85, marginTop: 1 },

  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  stats: { flexDirection: "row", gap: 10, marginTop: 8 },
  stat: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 14 },
  statValue: { fontFamily: F.bold, fontSize: 22, color: C.ink, letterSpacing: -0.5 },
  note: { backgroundColor: C.yolkSoft, borderRadius: 16, padding: 14 },
  secHead: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 8 },

  job: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 16, gap: 10, marginTop: 10 },
  jobMine: { borderWidth: 2, borderColor: C.ink },
  jobTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ticketId: { fontFamily: F.bold, fontSize: 15, color: C.ink, letterSpacing: 0.3 },
  chip: { flexDirection: "row", alignItems: "center", height: 28, paddingHorizontal: 11, borderRadius: 999, backgroundColor: C.soft },
  chipText: { fontFamily: F.semi, fontSize: 12.5, color: C.ink },
  flash: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 2, borderRadius: 18,
    backgroundColor: C.pepper, alignItems: "center", justifyContent: "center", gap: 12
  },
  flashTick: { width: 66, height: 66, borderRadius: 33, borderWidth: 3, borderColor: "rgba(255,255,255,0.5)", alignItems: "center", justifyContent: "center" },
  flashText: { fontFamily: F.bold, fontSize: 19, color: "#fff", letterSpacing: -0.2 },
  collect: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.pepperSoft, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },

  route: { backgroundColor: C.cream, borderRadius: 14, padding: 12 },
  stop: { flexDirection: "row", gap: 10 },
  stopRail: { width: 14, alignItems: "center", paddingTop: 4 },
  stopDot: { width: 12, height: 12, borderRadius: 6 },
  stopLine: { flex: 1, width: 2, backgroundColor: C.line, marginTop: 3 },
  stopLabel: { fontFamily: F.semi, fontSize: 11, letterSpacing: 1, color: C.muted }
});
