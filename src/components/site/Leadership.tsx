import { Crown, UserCheck, FileText, FilePlus, Wallet, WalletCards, CalendarDays, Users, MapPin } from "lucide-react";

const roles = [
  { icon: Crown, title: "Chairperson", desc: "Presides over all committee and general meetings." },
  { icon: UserCheck, title: "Vice Chairperson", desc: "Stands in for the Chairperson when required." },
  { icon: FileText, title: "Secretary", desc: "Manages correspondence, notices and all records of the society." },
  { icon: FilePlus, title: "Assistant Secretary", desc: "Supports and deputises for the Secretary." },
  { icon: Wallet, title: "Treasurer", desc: "Receives and disburses funds; keeps accurate books of account." },
  { icon: WalletCards, title: "Assistant Treasurer", desc: "Supports and deputises for the Treasurer." },
  { icon: CalendarDays, title: "Organizing Secretary", desc: "Plans meetings, logistics and hosts of the society." },
  { icon: Users, title: "Women Representative", desc: "Chairs the women's meetings and reports to the committee." },
  { icon: MapPin, title: "Branch Representative", desc: "Links the committee to members and chairs branch meetings." },
];

export const Leadership = () => {
  return (
    <section id="leadership" className="py-24 bg-secondary">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-semibold tracking-widest uppercase text-accent">Governance</p>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-display font-semibold text-primary">
            Office bearers
          </h2>
          <p className="mt-5 text-foreground/70 text-lg">
            Elected at the AGM by paid-up members. Each office bearer serves a term of{" "}
            <span className="font-semibold text-primary">two years</span> and may hold the same
            position for a maximum of <span className="font-semibold text-primary">two terms</span>.
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map((r) => (
            <div key={r.title} className="p-6 rounded-2xl bg-card border border-border shadow-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-gold grid place-items-center shadow-gold">
                  <r.icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <h3 className="font-display text-lg text-primary">{r.title}</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
