import type { ReactNode } from "react";
import { CustomerNav } from "@/components/customer-nav";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav />
      <main className="max-w-2xl mx-auto px-4 pb-12">{children}</main>
    </div>
  );
}
