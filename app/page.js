import Link from "next/link";

export default function Home() {
  return (
    <div className="wrap">
      <h1>Swiftplate<span>.</span></h1>
      <p className="sub">A multi-role food delivery platform: customer, vendor, rider and admin on one backend with role-based access control.</p>
      <div className="panel">
        <h2>Web dashboards</h2>
        <p className="note">Vendors manage their order queue; admins see everything.</p>
        <p style={{ marginTop: 12 }}>
          <Link className="btn" href="/login">Sign in →</Link>{" "}
          <Link className="btn" style={{ background:"#fff", color:"#101014", border:"1px solid #101014" }} href="/test">Test console →</Link>
        </p>
      </div>
      <div className="panel">
        <h2>Mobile apps</h2>
        <p className="note">Customer and rider apps (React Native / Expo): Phases 4 and 5.</p>
      </div>
      <div className="panel">
        <h2>Built by</h2>
        <p className="note">Raji Ibrahim Ajibola · <a href="https://github.com/jibolaaa/swiftplate-platform" target="_blank">github.com/jibolaaa/swiftplate-platform</a></p>
      </div>
    </div>
  );
}
