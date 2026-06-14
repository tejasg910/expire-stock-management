import type { ReactNode } from "react";

// Auth check lives in each protected page, not here —
// login page is also in this group and must not be redirected.
export default function ProviderLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
