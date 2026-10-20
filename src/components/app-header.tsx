"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserDTO } from "@/lib/users/service";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase());
  return letters.join("") || "?";
}

export function AppHeader({ user }: { user: UserDTO }) {
  const pathname = usePathname();
  const router = useRouter();
  const onInvoices = pathname.startsWith("/invoices");

  async function logOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Couldn't log out. Check your connection and try again.");
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-8 px-4 sm:px-6 lg:px-8">
        <Wordmark href="/invoices" />
        <nav aria-label="Main" className="hidden sm:block">
          <Link
            href="/invoices"
            aria-current={onInvoices ? "page" : undefined}
            className={cn(
              "rounded-sm py-1 text-sm transition-colors",
              onInvoices
                ? "border-b-[1.5px] border-foreground font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Invoices
          </Link>
        </nav>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 gap-2.5 px-2 sm:pr-4" aria-label={`Account menu for ${user.name}`}>
                <span
                  aria-hidden="true"
                  className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                >
                  {initials(user.name)}
                </span>
                <span className="hidden max-w-40 truncate text-sm sm:inline">{user.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="font-normal">
                <span className="block truncate text-sm font-medium text-foreground">{user.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={logOut}>
                <LogOut aria-hidden="true" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
