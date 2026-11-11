import Link from "next/link";
import { ArrowRight, ImageUp, Palette, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import { HERO_AFTER, HERO_BEFORE, STYLE_SHOWCASE } from "@/lib/decor";

const STEPS = [
  {
    icon: ImageUp,
    title: "Upload your room",
    text: "Snap a photo of the room as it is — no tidying required. Or try one of the sample rooms.",
  },
  {
    icon: Palette,
    title: "Pick a style",
    text: "Choose from Modern, Scandinavian, Japandi, Luxury and more, then set your room type and budget.",
  },
  {
    icon: Wand2,
    title: "Get your redesign",
    text: "Gemini redraws your room in the new style and explains it: palette, furniture, tips and cost.",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Badge variant="accent" className="mb-4">
              <Sparkles className="mr-1 size-3" aria-hidden /> Powered by Google Gemini
            </Badge>
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
              Your room,
              <br />
              reimagined by AI.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-stone-600">
              Upload a photo of your living room, bedroom or kitchen, pick a
              style you love, and see it redesigned in seconds — with a colour
              palette, furniture ideas and a realistic budget.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="accent" size="lg">
                <Link href="/studio">
                  Redesign my room <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/gallery">View my gallery</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-stone-500">
              No account needed. Your designs stay in your browser.
            </p>
          </div>
          <div>
            <BeforeAfterSlider beforeImage={HERO_BEFORE} afterImage={HERO_AFTER} />
            <p className="mt-3 text-center text-xs text-stone-500">
              Sample transformation — drag the handle to compare. Your redesign
              keeps your own room&apos;s layout.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            How it works
          </h2>
          <p className="mt-2 max-w-2xl text-stone-600">
            Three steps, under a minute — from a photo you already have to a
            room you can actually picture living in.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Card key={step.title}>
                <CardContent className="p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                    <step.icon className="size-5" aria-hidden />
                  </span>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Step {i + 1}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-stone-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{step.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Styles */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Find a style you love
        </h2>
        <p className="mt-2 max-w-2xl text-stone-600">
          From calm Scandinavian neutrals to rich, layered Luxury — every
          redesign is tailored to your room, your budget and your colours.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STYLE_SHOWCASE.map((item) => (
            <Card key={item.style} className="overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt={item.alt}
                className="aspect-[4/3] w-full object-cover"
                loading="lazy"
              />
              <CardContent className="p-5">
                <h3 className="text-lg font-semibold text-stone-900">{item.style}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-10 rounded-2xl bg-stone-900 px-6 py-10 text-center sm:px-10">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to see your room differently?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-stone-300">
            Upload one photo and get a full redesign — image, palette,
            furniture list and cost estimate.
          </p>
          <Button asChild variant="accent" size="lg" className="mt-6">
            <Link href="/studio">
              Open the Studio <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
