import { redirect } from "next/navigation";

// The old customer screen. Ordering now lives on the home page.
export default function OldCustomerPage() {
  redirect("/");
}
