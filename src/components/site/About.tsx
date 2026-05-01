import communityImg from "@/assets/community.jpg";

export const About = () => {
  return (
    <section id="about" className="py-24 bg-gradient-surface">
      <div className="container grid lg:grid-cols-2 gap-16 items-center">
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-gold opacity-20 rounded-2xl blur-2xl" />
          <img
            src={communityImg}
            alt="Members of the Kaler Nairobi Welfare community"
            width={1280}
            height={896}
            loading="lazy"
            className="relative rounded-2xl shadow-elegant w-full h-auto object-cover"
          />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-widest uppercase text-accent">Our Story</p>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-display font-semibold text-primary leading-tight">
            Founded in 1994 by the late Elijah Orwa & community elders.
          </h2>
          <div className="mt-6 space-y-5 text-foreground/80 leading-relaxed">
            <p>
              Kaler Nairobi Welfare Association was registered with the Registrar of Societies
              in Kenya in 1994. It was born from a simple, urgent need — to ensure that
              Kalerians living in Nairobi are never alone when tragedy strikes.
            </p>
            <p>
              Because Kaler in Nyatike sub-county sits far from the capital, transporting a
              departed loved one home is a heavy burden for any single family. Together, we
              shoulder it. Together, we honor our own.
            </p>
          </div>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            <div className="p-5 rounded-xl bg-card border border-border shadow-card">
              <p className="font-display text-xl text-primary">Our Heritage</p>
              <p className="mt-1 text-sm text-muted-foreground">Rooted in Nyatike, growing in Nairobi.</p>
            </div>
            <div className="p-5 rounded-xl bg-card border border-border shadow-card">
              <p className="font-display text-xl text-primary">Our Promise</p>
              <p className="mt-1 text-sm text-muted-foreground">No Kalerian grieves alone.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
