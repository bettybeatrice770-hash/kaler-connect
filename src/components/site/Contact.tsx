import { Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Contact = () => {
  return (
    <section id="contact" className="py-24 bg-gradient-surface">
      <div className="container max-w-5xl">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-semibold tracking-widest uppercase text-accent">Get In Touch</p>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-display font-semibold text-primary">
            Ready to join us?
          </h2>
          <p className="mt-5 text-foreground/70 text-lg">
            Reach out to a committee member to register, renew, or learn more.
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-3 gap-6">
          {[
            { icon: Phone, title: "Call Us", value: "+254 7XX XXX XXX", note: "Mon – Sat, 8am – 6pm" },
            { icon: Mail, title: "Email Us", value: "info@kalernairobi.org", note: "We reply within 48 hours" },
            { icon: MapPin, title: "Meet Us", value: "Nairobi, Kenya", note: "Monthly meetings — RSVP" },
          ].map((c) => (
            <div key={c.title} className="p-7 rounded-2xl bg-card border border-border shadow-card text-center">
              <div className="h-12 w-12 mx-auto rounded-xl bg-gradient-gold grid place-items-center shadow-gold">
                <c.icon className="h-6 w-6 text-accent-foreground" />
              </div>
              <p className="mt-5 font-display text-lg text-primary">{c.title}</p>
              <p className="mt-2 font-semibold text-foreground">{c.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 p-8 sm:p-10 rounded-2xl bg-primary text-primary-foreground text-center shadow-elegant">
          <h3 className="font-display text-2xl sm:text-3xl">Become a member today</h3>
          <p className="mt-3 text-primary-foreground/80 max-w-xl mx-auto">
            Stand with your community. Registration takes only a few minutes.
          </p>
          <Button variant="hero" size="lg" className="mt-7" asChild>
            <a href="tel:+2547XXXXXXXX">Speak to the Committee</a>
          </Button>
        </div>
      </div>
    </section>
  );
};
