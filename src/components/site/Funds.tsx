import { PiggyBank, TrendingUp } from "lucide-react";

export const Funds = () => {
  return (
    <section id="funds" className="py-24 bg-background">
      <div className="container max-w-5xl">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-semibold tracking-widest uppercase text-accent">Society Funds</p>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-display font-semibold text-primary">
            Two funds that secure our future.
          </h2>
          <p className="mt-5 text-foreground/70 text-lg">
            Beyond the annual subscription, the constitution establishes two member-owned funds.
          </p>
        </div>

        <div className="mt-14 grid lg:grid-cols-2 gap-6">
          <div className="p-8 rounded-2xl bg-card border border-border shadow-card">
            <div className="h-12 w-12 rounded-xl bg-gradient-gold grid place-items-center shadow-gold">
              <PiggyBank className="h-6 w-6 text-accent-foreground" />
            </div>
            <h3 className="mt-5 font-display text-2xl text-primary">Funeral Preparatory Fund (FPF)</h3>
            <p className="mt-4 text-foreground/75 leading-relaxed">
              Every member deposits with the society an amount equivalent to{" "}
              <span className="font-semibold text-primary">two funeral contributions</span>. This
              reserve is used to cover a member's contribution if they cannot pay due to lack of
              funds or absence — so the family is supported without delay.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-elegant">
            <div className="h-12 w-12 rounded-xl bg-accent grid place-items-center shadow-gold">
              <TrendingUp className="h-6 w-6 text-accent-foreground" />
            </div>
            <h3 className="mt-5 font-display text-2xl">Development Fund</h3>
            <p className="mt-4 text-primary-foreground/85 leading-relaxed">
              Every member of the society is automatically a{" "}
              <span className="font-semibold text-accent-glow">shareholder</span> in the Development
              Fund by buying shares as stipulated by the society — pooling capital for projects
              that grow our collective wealth.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
