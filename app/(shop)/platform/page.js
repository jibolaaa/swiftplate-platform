import Link from "next/link";
import Reveal from "../../../components/Reveal";
import { ArrowRight } from "../../../components/Icons";
import { DEMO_PEOPLE, ROLE_LABEL } from "../../../lib/roles";

export const metadata = {
  title: "How it's built",
  description: "How Swiftplate works: four roles on one backend, an order state machine, role-based access control, server-side pricing and near-live updates."
};

const FLOW = [
  ["pending", "Customer", "Places the order and pays on Paystack, by card or transfer. Prices come from the database, not the phone, and the kitchen can't see the order until the payment is confirmed."],
  ["accepted", "Kitchen", "Accepts it."],
  ["preparing", "Kitchen", "Starts cooking."],
  ["ready", "Kitchen", "Marks it packed and ready."],
  ["rider_assigned", "Rider", "Takes the job. First rider wins; the rest get a clear \"already taken\"."],
  ["picked_up", "Rider", "Collects it from the kitchen."],
  ["delivered", "Rider", "Hands it over. Done."]
];

const FACTS = [
  ["One table of users, four roles", "Customer, kitchen (vendor), rider and admin are all rows in one users table. A database check means no other role can exist."],
  ["Every route checks who you are", "Signing in returns a signed token (JWT) with your role inside. Each API route verifies it and refuses roles that don't belong, with 401 or 403."],
  ["Owning it, not just the role", "Being a kitchen isn't enough to move an order: it has to be your kitchen. A rider can only pick up and deliver jobs they took."],
  ["Prices the phone can't change", "The app only sends dish ids and quantities. The server looks up the real prices, adds delivery, and copies each dish's name and price into the order (snapshotting), so a menu change never rewrites an old receipt."],
  ["A full history of every order", "Each status change is logged with who made it and when. The tracking page and the admin read from that log."],
  ["No double claims", "A status change only applies if the order is still where it was checked. Two riders tapping at once can't both get the job."],
  ["Near-live updates", "Every screen checks for changes every 5 seconds. Swapping in a realtime service (like Pusher or Supabase Realtime) is the upgrade path, since plain WebSockets don't suit Vercel's serverless functions."],
  ["Paid before it's cooked", "An order only reaches the kitchen once the server has asked Paystack itself whether the money arrived, and checked the amount. Cancel before the kitchen accepts and the money goes back."],
  ["When will it arrive?", "The tracking page estimates the arrival time from how long each step usually takes, and draws where the food is: at the kitchen, with the rider, on the road."],
  ["Safe passwords", "Passwords are stored as bcrypt hashes. A wrong email and a wrong password get the same reply, so nobody can fish for accounts."]
];

const STACK = ["Next.js 14", "React", "React Native (Expo)", "PostgreSQL on Neon", "Paystack", "JWT (jose)", "bcrypt", "Vercel"];

export default function PlatformPage() {
  return (
    <div className="wrap page">
      <section className="page-head" style={{ maxWidth: 820 }}>
        <p className="eyebrow">How it's built</p>
        <h1 className="display" style={{ fontSize: "clamp(40px, 9vw, 72px)" }}>One backend, four apps<span className="dot">.</span></h1>
        <p className="lead">Swiftplate is a food delivery platform: customers order, kitchens cook, riders deliver and admins watch it all. Every app talks to the same Next.js API and the same Postgres database, and each role can only do its own part.</p>
      </section>

      <section className="section" aria-labelledby="try-title" style={{ paddingTop: 12 }}>
        <Reveal className="sec-head"><h2 id="try-title" className="title">Try every role</h2><p className="muted">Sign in as each person, in separate tabs, and run one order from start to finish.</p></Reveal>
        <div className="roles4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {DEMO_PEOPLE.map(p => (
            <Link key={p.role} href={`/login?as=${p.role}`} className="role" style={{ background: "var(--ink)" }}>
              <i aria-hidden="true">{p.icon}</i>
              <b>{ROLE_LABEL[p.role]}: {p.name}</b>
              <span>{p.does}</span>
            </Link>
          ))}
        </div>
        <p className="muted small" style={{ marginTop: 12 }}>The customer and rider also have phone apps (React Native, run with Expo). The web screens use the same API.</p>
      </section>

      <section className="section" aria-labelledby="flow-title">
        <Reveal className="sec-head"><h2 id="flow-title" className="title">An order is a state machine</h2><p className="muted">One row in the orders table moves through these steps. The server decides which role may make each move, from which step. It can also be cancelled: by the customer before the kitchen accepts, or by an admin any time before delivery.</p></Reveal>
        <ol className="flow">
          {FLOW.map(([status, who, what], i) => (
            <li key={status}>
              <span className="n">{i + 1}</span>
              <span style={{ display: "grid", gap: 4 }}>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}><code>{status}</code><span className="who">{who}</span></span>
                <span className="muted small">{what}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="section" aria-labelledby="facts-title">
        <Reveal className="sec-head"><h2 id="facts-title" className="title">What keeps it honest</h2></Reveal>
        <div className="cards3">
          {FACTS.map(([title, body]) => (
            <div key={title} className="fact"><h3 className="h3">{title}</h3><p>{body}</p></div>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="stack-title">
        <Reveal className="sec-head"><h2 id="stack-title" className="title">Built with</h2></Reveal>
        <ul className="stack">{STACK.map(s => <li key={s}>{s}</li>)}</ul>
        <div className="hero-actions" style={{ marginTop: 22 }}>
          <a className="btn ink" href="https://github.com/jibolaaa/swiftplate-platform" target="_blank" rel="noopener noreferrer">Read the code <ArrowRight /></a>
          <Link className="btn ghost" href="/test">API test console</Link>
        </div>
        <p className="muted small" style={{ marginTop: 16 }}>Built by <a className="link" href="https://ibrahimraji.vercel.app" target="_blank" rel="noopener noreferrer">Raji Ibrahim Ajibola</a>.</p>
      </section>
    </div>
  );
}
