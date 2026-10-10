import type { HeroSection } from "@/modules/store-config/application";

export function Hero({ title, subtitle }: HeroSection["props"]) {
  return (
    <section className="px-4 pt-10 pb-8 md:px-8 md:pt-16 md:pb-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 h-1 w-12 rounded-full bg-primary" aria-hidden />
        <h1 className="font-display text-h1 font-bold break-words">{title}</h1>
        {subtitle ? (
          <p className="mt-3 max-w-2xl text-body md:text-h3">{subtitle}</p>
        ) : null}
      </div>
    </section>
  );
}
