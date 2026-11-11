import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-900 text-stone-300">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-sm">
          <p className="text-lg font-bold text-white">DecorAI</p>
          <p className="mt-2 text-sm leading-relaxed">
            AI interior decoration. Upload a photo of your room, pick a style,
            and see it redesigned — with a palette, furniture ideas and a
            realistic cost range.
          </p>
        </div>
        <nav className="flex flex-col gap-2 text-sm" aria-label="Footer navigation">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/studio" className="hover:text-white">Studio</Link>
          <Link href="/gallery" className="hover:text-white">My Gallery</Link>
        </nav>
        <p className="max-w-xs text-xs leading-relaxed text-stone-400">
          Powered by Google Gemini. Your Gemini API key stays on the server —
          it is never sent to the browser or stored with your designs. Designs
          are saved only in your browser&apos;s local storage.
        </p>
      </div>
      <div className="border-t border-stone-800 py-4 text-center text-xs text-stone-500">
        DecorAI — a room, reimagined.
      </div>
    </footer>
  );
}
