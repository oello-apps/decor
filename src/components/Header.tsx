import Link from "next/link";
import { Armchair, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-[#faf7f2]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="DecorAI home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-white">
            <Armchair className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-bold tracking-tight text-stone-900">
            DecorAI
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium text-stone-600" aria-label="Main navigation">
          <Link href="/" className="rounded-full px-3 py-2 hover:bg-stone-100 hover:text-stone-900">
            Home
          </Link>
          <Link href="/studio" className="rounded-full px-3 py-2 hover:bg-stone-100 hover:text-stone-900">
            Studio
          </Link>
          <Link href="/gallery" className="rounded-full px-3 py-2 hover:bg-stone-100 hover:text-stone-900">
            Gallery
          </Link>
        </nav>
        <Button asChild variant="accent" size="sm" className="hidden sm:inline-flex">
          <Link href="/studio">
            <Sparkles aria-hidden /> Redesign a room
          </Link>
        </Button>
      </div>
    </header>
  );
}
