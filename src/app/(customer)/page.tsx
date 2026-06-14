import { redirect } from "next/navigation";

// Avoid route conflict with app/page.tsx — home lives at /home
export default function CustomerIndexPage() {
  redirect("/home");
}
