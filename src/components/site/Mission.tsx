import { TrendingUp, HeartPulse, Handshake, Briefcase, GraduationCap, Award } from "lucide-react";

const objectives = [
  {
    icon: TrendingUp,
    title: "Development Projects",
    desc: "Fundraising and coordinating projects that build long-term value for the community.",
  },
  {
    icon: HeartPulse,
    title: "Sickness & Bereavement",
    desc: "Standing with members in times of illness and loss — financially, practically, and emotionally.",
  },
  {
    icon: Handshake,
    title: "Strategic Partnerships",
    desc: "Tapping opportunities from financial institutions, CBOs, NGCDF and other partners for the society's benefit.",
  },
  {
    icon: Briefcase,
    title: "Jobs & Enterprise",
    desc: "Job creation through business set-ups and start-up capital for women and youth.",
  },
  {
    icon: GraduationCap,
    title: "Youth Empowerment",
    desc: "Counselling, career guidance, and talent identification to help young Kalerians thrive.",
  },
  {
    icon: Award,
    title: "A Model Group",
    desc: "Nurturing a well-run association that other community groups can benchmark against.",
  },
];

export const Mission = () => {
  return (
    <section id="mission" className="py-24 bg-background">
      <div className="container">
        {/* Vision & Mission */}
        <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div className="p-8 rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-elegant">
            <p className="text-xs font-bold tracking-widest uppercase text-accent-glow">Our Vision</p>
            <p className="mt-4 font-display text-2xl sm:text-3xl leading-snug">
              Economic empowerment for better health and progress to the members.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-card border border-border shadow-card">
            <p className="text-xs font-bold tracking-widest uppercase text-accent">Our Mission</p>
            <p className="mt-4 font-display text-2xl sm:text-3xl text-primary leading-snug">
              Eradication of poverty through community empowerment.
            </p>
          </div>
        </div>

        {/* Objectives */}
        <div className="mt-20 max-w-2xl mx-auto text-center">
          <p className="text-sm font-semibold tracking-widest uppercase text-accent">Our Objectives</p>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-display font-semibold text-primary">
            Six commitments to our community.
          </h2>
          <p className="mt-5 text-foreground/70 text-lg">
            Drawn directly from the association's constitution — what we exist to do.
          </p>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {objectives.map((it) => (
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
