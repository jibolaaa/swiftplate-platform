// The four roles, where each one starts, and the demo accounts the seed
// creates (app/api/dev/seed). Safe to use on the server and in the browser.
export const ROLES = ["customer", "vendor", "rider", "admin"];
export const ROLE_LABEL = { customer: "Customer", vendor: "Kitchen", rider: "Rider", admin: "Admin" };
export const ROLE_HOME = { customer: "/", vendor: "/vendor", rider: "/rider", admin: "/admin" };

export const DEMO_PASSWORD = "password123";
export const DEMO_PEOPLE = [
  { role: "customer", email: "customer@swiftplate.test", name: "Chidi", icon: "🍽️", does: "Orders food and follows it" },
  { role: "vendor", email: "vendor@swiftplate.test", name: "Vera", icon: "👩🏾‍🍳", does: "Runs the kitchen: accepts and cooks" },
  { role: "rider", email: "rider@swiftplate.test", name: "Rex", icon: "🛵", does: "Picks up and delivers" },
  { role: "admin", email: "admin@swiftplate.test", name: "Ada", icon: "📊", does: "Sees every order and the money" }
];
