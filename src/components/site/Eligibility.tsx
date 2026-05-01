import { GraduationCap, Heart, UserPlus, Stethoscope } from "lucide-react";

const cards = [
  {
    icon: GraduationCap,
    title: "Students",
    desc: "Anyone over 18 still under the care of a parent or guardian. Pays registration and annual subscription, but is exempt from funeral and other contributions.",
  },
  {
    icon: Heart,
    title: "Married Women",
    desc: "Eligible for membership where the husband is a live member. Exempt from funeral and other contributions.",
  },
  {
    icon: UserPlus,
    title: "Single Women & Widows",
    desc: "Eligible for membership in their own right and participate fully in all society contributions.",
  },
  {
    icon: Stethoscope,
    title: "Visitors",
    desc: "A visitor staying more than two weeks must be reported to the office. After three months they must register as a member. Visitors seeking medical attention are notified immediately and treated as a special case.",
  },
];

export const Eligibility = () => {
  return (
    <section id="eligibility" className="py-24 bg-secondary">
      <div className="container max-w-6xl">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-semibold tracking-widest uppercase text-accent">Who Can Join</p>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-display font-semibold text-primary">
            Membership categories
          </h2>
          <p className="mt-5 text-foreground/70 text-lg">
            The constitution provides clear guidance on who joins and how each member contributes.
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 gap-5">
          {cards.map((c) => (
            <div key={c.title} className="p-6 rounded-2xl bg-card border border-border shadow-card">
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-xl bg-gradient-gold grid place-items-center shadow-gold shrink-0">
                  <c.icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-display text-lg text-primary">{c.title}</h3>
                  <p className="mt-2 text-sm text-foreground/75 leading-relaxed">{c.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
