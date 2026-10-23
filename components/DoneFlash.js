// A tick drawn over a ticket or job for a moment after a step goes through,
// so the kitchen and the rider can see it worked.
export default function DoneFlash({ label }) {
  return (
    <div className="done-flash" role="status">
      <svg viewBox="0 0 52 52" className="tick-draw" aria-hidden="true"><circle cx="26" cy="26" r="24" /><path d="M15 27l7 7 15-16" /></svg>
      <b>{label}</b>
    </div>
  );
}
