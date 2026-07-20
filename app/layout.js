import "./globals.css";

export const metadata = {
  title: "Swiftplate | Multi-role delivery platform",
  description: "Swiftplate: customer, vendor, rider and admin roles on one backend. Built by Raji Ibrahim Ajibola."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en"><body>{children}</body></html>
  );
}
