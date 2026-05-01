import { Check, Calendar, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Membership = () => {
  return (
    <section id="membership" className="py-24 bg-secondary">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-semibold tracking-widest uppercase text-accent">Membership</p>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-display font-semibold text-primary">
            Simple, transparent membership.
          </h2>
          <p className="mt-5 text-foreground/70 text-lg">
            Join your fellow Kalerians and become part of a network that always shows up.
          </p>
        </div>

        <div className="mt-16 grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto" id="join">
          {/* New Members */}
          <div className="relative p-8 sm:p-10 rounded-2xl bg-card border border-border shadow-card">
            <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">New Members</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-5xl text-primary font-semibold">Ksh 700</span>
              <span className="text-muted-foreground">first year</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Ksh 500 registration + Ksh 200 annual renewal</p>
            <ul className="mt-8 space-y-4">
              {[
                "One-time Ksh 500 registration fee",
                "Ksh 200 annual renewal included",
                "Full bereavement support coverage",
                "Voting rights at general meetings",
              ].map((f) => (
                <li key={f} className="flex gap-3 text-foreground/85">
                  <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button variant="hero" className="mt-10 w-full" size="lg" asChild>
              <a href="#contact">Register Now</a>
            </Button>
          </div>

          {/* Existing Members */}
          <div className="relative p-8 sm:p-10 rounded-2xl bg-primary text-primary-foreground shadow-elegant">
            <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-bold uppercase tracking-wider">
              Renewal
            </span>
            <p className="text-xs font-bold tracking-widest uppercase text-accent-glow">Existing Members</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-5xl font-semibold">Ksh 200</span>
              <span className="text-primary-foreground/70">per year</span>
            </div>
            <p className="mt-2 text-sm text-primary-foreground/70">Annual renewal — keeps your membership active</p>
            <ul className="mt-8 space-y-4">
              {[
                "Renew by 28th February each year",
                "Late fine of Ksh 100 after the deadline",
                "Membership ceases if unpaid by August",
                "Continuous bereavement coverage",
              ].map((f) => (
                <li key={f} className="flex gap-3">
                  <Check className="h-5 w-5 text-accent-glow shrink-0 mt-0.5" />
                  <span className="text-primary-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
            <Button variant="hero" className="mt-10 w-full" size="lg" asChild>
              <a href="#contact">Renew Membership</a>
            </Button>
          </div>
        </div>

        {/* Important deadlines */}
        <div className="mt-12 max-w-5xl mx-auto grid sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border">
            <Calendar className="h-6 w-6 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-primary">February 28</p>
              <p className="text-sm text-muted-foreground">Annual renewal deadline.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border">
            <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-primary">August Cut-off</p>
              <p className="text-sm text-muted-foreground">Unpaid members cease membership.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
