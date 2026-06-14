"use client";

import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";

export function CustomerNav() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-orange-500">LastBite</span>
        </Link>
        <nav className="flex items-center gap-2">
          {session ? (
            <>
              <Link href="/my-pickups">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <ShoppingBag size={15} />
                  My Pickups
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
