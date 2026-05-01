import { Smartphone, Info, Building2 } from "lucide-react";

export const Contributions = () => {
  return (
    <section id="contributions" className="py-24 bg-background">
      <div className="container grid lg:grid-cols-5 gap-12 items-start">
        <div className="lg:col-span-2">
          <p className="text-sm font-semibold tracking-widest uppercase text-accent">Bereavement Contribution</p>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-display font-semibold text-primary leading-tight">
            When one of us falls, all of us rise.
          </h2>
          <p className="mt-6 text-foreground/75 text-lg leading-relaxed">
            Each member contributes <span className="font-semibold text-primary">Ksh 1,500</span> when
            we lose a fellow Kalerian. This collective contribution funds funeral expenses and the
            journey home to Nyatike.
          </p>
          <div className="mt-8 p-5 rounded-xl bg-secondary border-l-4 border-accent">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80">
                <span className="font-semibold text-primary">Exemptions:</span> Women and students
                are exempt from the Ksh 1,500 bereavement contribution — except in the case of a
                woman without a husband, who contributes as a primary member.
              </p>
            </div>
          </div>
        </div>

        {/* Payment card */}
        <div className="lg:col-span-3">
          <div className="p-8 sm:p-10 rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-elegant relative overflow-hidden">
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <Smartphone className="h-6 w-6 text-accent-glow" />
                <p className="text-sm font-semibold tracking-widest uppercase text-accent-glow">M-Pesa Paybill</p>
              </div>
              <h3 className="mt-4 font-display text-2xl sm:text-3xl">Pay directly via Lipa na M-Pesa</h3>

              <div className="mt-8 grid sm:grid-cols-2 gap-5">
                <div className="p-5 rounded-xl bg-primary-foreground/10 border border-primary-foreground/15 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-wider text-primary-foreground/60">Paybill Number</p>
                  <p className="mt-2 font-display text-3xl font-semibold text-accent-glow">247247</p>
                  <p className="mt-1 text-xs text-primary-foreground/60">Equity Bank Paybill</p>
                </div>
                <div className="p-5 rounded-xl bg-primary-foreground/10 border border-primary-foreground/15 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-wider text-primary-foreground/60">Account Number</p>
                  <p className="mt-2 font-display text-3xl font-semibold text-accent-glow">0020182728325</p>
                  <p className="mt-1 text-xs text-primary-foreground/60">Kaler Nairobi Welfare Association</p>
                </div>
              </div>

              <ol className="mt-8 space-y-3 text-sm text-primary-foreground/85">
                {[
                  "Go to M-Pesa → Lipa na M-Pesa → Pay Bill",
                  "Enter Business Number: 247247",
                  "Enter Account Number: 0020182728325",
                  "Enter the amount and confirm with your PIN",
                  "Forward the M-Pesa confirmation SMS to the Secretary on 0701594936",
                ].map((step, i) => (
                  <li key={step} className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-accent text-accent-foreground grid place-items-center text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Bank deposit alternative */}
          <div className="mt-6 p-6 rounded-2xl bg-card border border-border shadow-card">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl bg-gradient-gold grid place-items-center shadow-gold shrink-0">
                <Building2 className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="font-display text-lg text-primary">Or deposit at any Equity Bank Agent</p>
                <p className="mt-2 text-sm text-foreground/75 leading-relaxed">
                  Visit your nearest <span className="font-semibold text-primary">Equity Bank Agent</span> and
                  deposit to account <span className="font-semibold text-primary">0020182728325</span> —
                  <span className="font-semibold text-primary"> Kaler Nairobi Welfare Association</span>.
                  Then share the bank slip with the Secretary
                  (<a href="tel:+254701594936" className="text-accent font-semibold hover:underline">0701594936</a>)
                  for confirmation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
