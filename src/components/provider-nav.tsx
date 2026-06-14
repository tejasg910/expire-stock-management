"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, LayoutDashboard } from "lucide-react";

export function ProviderNav() {
  const router = useRouter();
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/provider/dashboard" className="flex items-center gap-2">
            <span className="text-orange-500 font-bold text-lg">LastBite</span>
            <span className="text-gray-300 text-sm font-medium">Provider</span>
          </Link>
          <Link href="/provider/dashboard" className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <LayoutDashboard size={14} />
            Dashboard
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/provider/listings/new">
            <Button size="sm" className="gap-1.5">
              <Plus size={14} />
              New listing
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-gray-500"
            onClick={() => signOut({ fetchOptions: { onSuccess: () => router.push("/provider/login") } })}
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
