import Link from "next/link";
export default function Home() {
  return (
    <div className="wrap">
      <h1>Swiftplate<span>.</span></h1>
      <p className="sub">A multi-role food delivery platform: customer, vendor, rider and admin on one backend with role-based access control.</p>
      <div className="panel">
        <h2>Try it</h2>
        <p className="note">Sign in with a demo account and land in the right dashboard for your role.</p>
        <p style={{ marginTop: 12 }}>
          <Link className="btn" href="/login">Sign in →</Link>{" "}
          <Link className="btn alt" href="/test" style={{ marginLeft: 6 }}>API test console</Link>
        </p>
      </div>
      <div className="panel">
        <h2>Built by</h2>
        <p className="note">Raji Ibrahim Ajibola · <a href="https://github.com/jibolaaa/swiftplate-platform" target="_blank">GitHub</a></p>
      </div>
    </div>
  );
}
