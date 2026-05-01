import { ScrollText } from "lucide-react";

export const Constitution = () => {
  return (
    <section id="constitution" className="py-24 bg-gradient-surface">
      <div className="container max-w-6xl">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-semibold tracking-widest uppercase text-accent">Our Governance</p>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-display font-semibold text-primary">
            The Constitution
          </h2>
          <p className="mt-5 text-foreground/70 text-lg">
            The updated and amended constitution that guides every decision, contribution and
            commitment of the Kaler Nairobi Welfare Association.
          </p>
        </div>

        <div className="mt-12 rounded-2xl bg-card border border-border shadow-elegant overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-primary text-primary-foreground">
            <ScrollText className="h-5 w-5 text-accent-glow" />
            <p className="font-display text-lg">Kaler Nairobi Welfare — Constitution</p>
          </div>
          <div
            className="relative w-full bg-muted"
            style={{ height: "min(80vh, 900px)" }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <iframe
              src="/kaler-constitution.pdf#toolbar=0&navpanes=0&scrollbar=1&view=FitH"
              title="Kaler Nairobi Welfare Association Constitution"
              className="absolute inset-0 w-full h-full border-0"
            />
          </div>
          <p className="px-6 py-3 text-xs text-muted-foreground text-center border-t border-border">
            For reference only — please contact the Secretary for printed or certified copies.
          </p>
        </div>
      </div>
    </section>
  );
};
