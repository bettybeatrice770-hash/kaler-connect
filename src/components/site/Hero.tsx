import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck } from "lucide-react";

const heroImg = "/hero-nairobi.webp";

export const Hero = () => {
  return (
    <section id="top" className="relative min-h-[92vh] flex items-center overflow-hidden">
      <img
        src={heroImg}
        alt="Nairobi skyline at sunset"
        width={1920}
        height={1088}
        fetchPriority="high"
        {...({ fetchpriority: "high" } as any)}
        decoding="async"
        loading="eager"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="container relative z-10 py-32">
        <div className="max-w-3xl text-primary-foreground animate-fade-up">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/40 bg-accent/10 text-accent-glow text-xs font-semibold tracking-widest uppercase">
              <ShieldCheck className="h-3.5 w-3.5" />
              Registered 2009 · Society of Kenya
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent bg-accent text-accent-foreground text-xs font-bold tracking-widest uppercase shadow-gold">
              Founded in 1988
            </span>
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-7xl font-display font-semibold leading-[1.05]">
            Kaler Welfare Association: Standing Together for <span className="text-accent-glow">Kalerians</span> in Nairobi.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-primary-foreground/85 max-w-2xl leading-relaxed">
            The Kaler Nairobi Welfare Association provides trusted bereavement support Nairobi
            families rely on — empowering the Kalerians community through shared progress,
            economic upliftment, and standing with every family during loss.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button variant="hero" size="lg" asChild>
              <a href="#join">
                Become a Member <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="outlineLight" size="lg" asChild>
              <a href="#about">Learn Our Story</a>
            </Button>
          </div>
          <div className="mt-14 grid grid-cols-3 gap-6 max-w-xl">
            {[
              { v: "30+", l: "Years of Service" },
              { v: "1988", l: "Year Founded" },
              { v: "Ksh 1,500", l: "Bereavement Pledge" },
            ].map((s) => (
              <div key={s.l} className="border-l-2 border-accent pl-4">
                <p className="font-display text-2xl sm:text-3xl text-accent-glow">{s.v}</p>
                <p className="text-xs sm:text-sm text-primary-foreground/70 mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
