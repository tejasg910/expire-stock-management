import { redirect } from "next/navigation";

// Root redirects to customer home; (customer)/home/page.tsx owns the real content.
export default function RootPage() {
  redirect("/home");
}
