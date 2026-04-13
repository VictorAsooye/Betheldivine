// Root page — middleware handles routing to the correct dashboard or /login
// This page is never rendered directly in normal usage.
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/login");
}
