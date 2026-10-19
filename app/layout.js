import "./globals.css";

export const metadata = {
  title: { default: "Swiftplate | Lagos food, delivered", template: "%s | Swiftplate" },
  description: "Swiftplate is a food delivery platform demo: order from Lagos kitchens and follow your food step by step. Customer, kitchen, rider and admin apps on one backend. Built by Raji Ibrahim Ajibola."
};

export const viewport = { themeColor: "#fbf4ea" };

// Marks that JavaScript is running, so scroll reveals only hide what they can show again.
const boot = `document.documentElement.classList.add("js")`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/bricolage-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
        <script dangerouslySetInnerHTML={{ __html: boot }} />
      </head>
      <body>
        <a href="#main" className="skip">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
