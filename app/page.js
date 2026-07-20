import Link from "next/link";

export default function Home() {
  return (
    <div className="wrap">
      <h1>Swiftplate<span>.</span></h1>
      <p className="sub">A multi-role food delivery platform: customer, vendor, rider and admin on one backend with role-based access control. Phase 1: core API + auth.</p>
      <div className="panel">
        <h2>Status</h2>
        <p className="note">API endpoints live under /api. Use the test console to try them from your phone.</p>
        <p style={{ marginTop: 12 }}><Link className="btn" href="/test">Open test console →</Link></p>
      </div>
      <div className="panel">
        <h2>Built by</h2>
        <p className="note">Raji Ibrahim Ajibola · <a href="https://github.com/jibolaaa/swiftplate-platform" target="_blank">github.com/jibolaaa/swiftplate-platform</a></p>
      </div>
    </div>
  );
}
