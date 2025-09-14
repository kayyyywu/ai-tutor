"use client";

import Link from "next/link";
import { User } from "next-auth";
import { History } from "./history";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export function NavbarClient({ session }: { session?: { user?: User | null } | null }) {
  return (
    <div className="bg-background absolute top-0 left-0 w-dvw py-2 px-3 justify-between flex flex-row items-center z-30">
      <div className="flex flex-row gap-3 items-center">
        <History user={session?.user || undefined} />
        <div className="flex flex-row gap-2 items-center">
          <div className="text-sm dark:text-zinc-300 truncate w-28 md:w-fit font-medium">
            AI Tutor
          </div>
        </div>
      </div>

      {session?.user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="py-1.5 px-2 h-fit font-normal" variant="secondary">
              {session.user?.email}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <ThemeToggle />
            </DropdownMenuItem>
            <DropdownMenuItem className="p-1 z-50">
              <Link href="/api/auth/signout" className="w-full text-left px-1 py-0.5 text-red-500">
                Sign out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button className="py-1.5 px-2 h-fit font-normal text-white" asChild>
          <Link href="/login">Login</Link>
        </Button>
      )}
    </div>
  );
}


