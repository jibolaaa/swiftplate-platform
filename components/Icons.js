// Simple line icons, drawn in the text colour.
const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };

export const BagIcon = (p) => <svg {...base} {...p}><path d="M5 8h14l-1.2 12H6.2L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></svg>;
export const PlusIcon = (p) => <svg {...base} {...p} strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>;
export const MinusIcon = (p) => <svg {...base} {...p} strokeWidth="2.2"><path d="M5 12h14" /></svg>;
export const CheckIcon = (p) => <svg {...base} {...p} strokeWidth="2.6"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
export const ArrowRight = (p) => <svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const ArrowLeft = (p) => <svg {...base} {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>;
export const PinIcon = (p) => <svg {...base} {...p}><path d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.4" /></svg>;
export const ClockIcon = (p) => <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>;
export const BikeIcon = (p) => <svg {...base} {...p}><circle cx="6" cy="16.5" r="3" /><circle cx="18" cy="16.5" r="3" /><path d="M6 16.5h5l3.5-6H18M9.5 7.5h3l2 3M15 7h2.5" /></svg>;
export const LogoutIcon = (p) => <svg {...base} {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 8l-4 4 4 4M6 12h10" /></svg>;
export const UserIcon = (p) => <svg {...base} {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></svg>;
