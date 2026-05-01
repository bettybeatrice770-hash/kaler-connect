import { HeartHandshake, Users, HandCoins, Home } from "lucide-react";

const items = [
  {
    icon: HeartHandshake,
    title: "Bereavement Support",
    desc: "Immediate, organized assistance to families when a member is lost — covering funeral logistics from Nairobi to Nyatike.",
  },
  {
    icon: Users,
    title: "Unity in the City",
    desc: "Bringing together Kalerians across Nairobi for fellowship, mutual support, and shared identity.",
  },
  {
    icon: HandCoins,
    title: "Collective Strength",
    desc: "Pooled member contributions ensure no single family carries the financial weight of bereavement alone.",
  },
  {
    icon: Home,
    title: "Honoring Our Roots",
    desc: "Helping departed members return home to Kaler with dignity, respect, and the support of their community.",
  },
];

export const Mission = () => {
  return (
    <section id="mission" className="py-24 bg-background">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-semibold tracking-widest uppercase text-accent">What We Do</p>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-display font-semibold text-primary">
            A community built on care.
          </h2>
          <p className="mt-5 text-foreground/70 text-lg">
            Four pillars guide everything we do as a welfare association.
          </p>
        </div>
        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((it) => (
            <div
              key={it.title}
              className="group p-7 rounded-2xl bg-card border border-border shadow-card hover:shadow-elegant hover:-translate-y-1 transition-all duration-500"
            >
              <div className="h-12 w-12 rounded-xl bg-gradient-gold grid place-items-center shadow-gold group-hover:scale-110 transition-transform">
                <it.icon className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="mt-5 font-display text-xl text-primary">{it.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
