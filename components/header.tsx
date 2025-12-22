"use client";

import {
  BookOpen,
  Search,
  Puzzle,
  Gamepad2,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-card">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Book Generator
            </h1>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <Button
            asChild
            variant={pathname === "/" ? "default" : "ghost"}
            size="sm"
          >
            <Link href="/" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Story Generator
            </Link>
          </Button>
          <Button
            asChild
            variant={pathname === "/conversations" ? "default" : "ghost"}
            size="sm"
          >
            <Link href="/conversations" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Conversations
            </Link>
          </Button>
          <Button
            asChild
            variant={pathname === "/wordsearch" ? "default" : "ghost"}
            size="sm"
          >
            <Link href="/wordsearch" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Word Search PDF
            </Link>
          </Button>
          <Button
            asChild
            variant={pathname === "/wordfillin" ? "default" : "ghost"}
            size="sm"
          >
            <Link href="/wordfillin" className="flex items-center gap-2">
              <Puzzle className="h-4 w-4" />
              Word Fill-in Puzzle
            </Link>
          </Button>
          <Button
            asChild
            variant={pathname === "/gamebook" ? "default" : "ghost"}
            size="sm"
          >
            <Link href="/gamebook" className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              Game Book
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
