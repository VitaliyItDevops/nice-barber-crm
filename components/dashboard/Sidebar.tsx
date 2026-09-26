"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Calendar,
  LogOut,
  Scissors,
  UserCog,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

const nav = [
  { href: "/", label: "Schedule", icon: Calendar },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/staff", label: "Staff", icon: UserCog },
  { href: "/services", label: "Services", icon: Scissors },
] as const;

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[220px] flex-col border-r border-[#E5E5E5] bg-white">
      <div className="border-b border-[#E5E5E5] px-5 py-5">
        <div className="text-[16px] font-bold tracking-wide text-[#1A1A1A]">
          NICE BARBER
        </div>
        <div className="mt-0.5 text-[12px] text-[#737373]">Admin</div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-[#FFF8ED] text-[#D4A24E]"
                  : "text-[#1A1A1A] hover:bg-[#FAFAFA]"
              }`}
            >
              <Icon
                className="h-4 w-4 shrink-0"
                color={active ? "#D4A24E" : "#1A1A1A"}
              />
              <span className="hidden sm:inline lg:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#E5E5E5] p-4">
        <p className="mb-2 truncate text-xs text-[#737373]" title={email}>
          {email}
        </p>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[#1A1A1A] hover:bg-[#FAFAFA]"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}
