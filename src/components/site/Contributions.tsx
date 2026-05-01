import { Smartphone, Info } from "lucide-react";

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
                  <p className="mt-2 font-display text-3xl font-semibold text-accent-glow">XXXXXX</p>
                  <p className="mt-1 text-xs text-primary-foreground/60">To be updated</p>
                </div>
                <div className="p-5 rounded-xl bg-primary-foreground/10 border border-primary-foreground/15 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-wider text-primary-foreground/60">Account Number</p>
                  <p className="mt-2 font-display text-3xl font-semibold text-accent-glow">Your Name</p>
                  <p className="mt-1 text-xs text-primary-foreground/60">Use full registered name</p>
                </div>
              </div>

              <ol className="mt-8 space-y-3 text-sm text-primary-foreground/85">
                {[
                  "Go to M-Pesa → Lipa na M-Pesa → Pay Bill",
                  "Enter the Paybill number above",
                  "Enter your full name as the account",
                  "Enter the amount and confirm with your PIN",
                  "Forward the confirmation SMS to the treasurer",
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
        </div>
      </div>
    </section>
  );
};
