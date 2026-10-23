// A drawn route from the kitchen to you, with the rider on it.
// It is not a real map: there is no GPS here, so the rider's spot is
// worked out from how long ago the food was picked up (see estimate() in
// lib/food.js). The page says it's an estimate.

// The road: one smooth curve from the kitchen (left) to you (right).
const P0 = [40, 132], P1 = [120, 22], P2 = [228, 178], P3 = [320, 48];

function bezier(t) {
  const u = 1 - t;
  const x = u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0];
  const y = u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1];
  return [x, y];
}

// Points spaced evenly along the road, so 50% means halfway by distance.
const SAMPLES = (() => {
  const pts = [], lens = [0];
  for (let i = 0; i <= 80; i++) pts.push(bezier(i / 80));
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, lens, total: lens[lens.length - 1] };
})();

export function pointAt(fraction) {
  const f = Math.min(1, Math.max(0, fraction)) * SAMPLES.total;
  const { pts, lens } = SAMPLES;
  let i = 1;
  while (i < lens.length - 1 && lens[i] < f) i++;
  const seg = lens[i] - lens[i - 1] || 1;
  const k = (f - lens[i - 1]) / seg;
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
}

const ROAD = `M${P0} C${P1} ${P2} ${P3}`;

export default function RouteMap({ where, progress, kitchen, rider }) {
  const moving = where === "on_the_way" || where === "delivered";
  const done = where === "delivered" ? 1 : moving ? progress || 0 : 0;
  const riderAt = where === "to_kitchen" ? [P0[0] + 26, P0[1] + 26] : pointAt(done);
  const showRider = where === "to_kitchen" || where === "on_the_way";
  const arrived = where === "delivered";
  const label = where === "to_kitchen" ? `${rider || "The rider"} is heading to the kitchen`
    : where === "on_the_way" ? `${rider || "Your rider"} is on the way`
    : where === "delivered" ? "Delivered"
    : "Your food is at the kitchen";

  return (
    <figure className="route-map">
      <svg viewBox="0 0 360 200" role="img" aria-label={`${label}. Estimated position.`}>
        <rect x="0" y="0" width="360" height="200" rx="18" className="rm-ground" />
        {/* a few quiet streets, just for the feel of a map */}
        <path d="M0 70 H360 M0 150 H360 M70 0 V200 M180 0 V200 M290 0 V200" className="rm-streets" />
        <path d={ROAD} className="rm-road" />
        <path d={ROAD} className="rm-left" />
        <path d={ROAD} className="rm-done" pathLength="1" strokeDasharray={`${done} 1`} />

        <g transform={`translate(${P0[0]} ${P0[1]})`} className={`rm-kitchen ${moving ? "" : "here"}`}>
          {!moving && <circle r="24" className="rm-halo" />}
          <circle r="16" />
          <path d="M-6 -5 v6 a2 2 0 0 0 4 0 v-6 M-4 1 v8 M4 -6 c3 2 3 7 0 9 v7" />
        </g>
        <g transform={`translate(${P3[0]} ${P3[1]})`} className="rm-home">
          {arrived && <circle r="24" className="rm-halo" />}
          <circle r="16" />
          <path d={arrived ? "M-7 0 L-2 5 L7 -5" : "M-7 0 L0 -7 L7 0 M-5 -2 V7 H5 V-2"} />
        </g>
        {showRider && (
          <g transform={`translate(${riderAt[0]} ${riderAt[1]})`} className="rm-rider">
            <circle r="15" />
            <path d="M-7 4 a3 3 0 1 0 0.01 0 M7 4 a3 3 0 1 0 0.01 0 M-7 4 h6 l4 -7 h4 M-2 -6 h4" />
          </g>
        )}
        <text x={P0[0] - 22} y={P0[1] + 40} className="rm-label">{kitchen}</text>
        <text x={P3[0] + 16} y={P3[1] - 26} className="rm-label" textAnchor="end">You</text>
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
