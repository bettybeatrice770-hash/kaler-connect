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
            A history of unity and community support.
          </h2>
          <div className="mt-6 space-y-5 text-foreground/80 leading-relaxed">
            <p>
              The origins of our welfare association trace back to the late <b>1980s</b>. 
              Following the passing of <b>Arum Oketho</b> from Mageta Wagire, Tanzania, 
              members of the Kalerian community from <b>Githogoro and Kasarani</b> came 
              together to contribute towards his funeral. This spirit of unity inspired 
              the Kalerians to convene a formal meeting in <b>1988</b> at the home of 
              the late <b>Elijah Orwa</b> in Mathare.
            </p>
            <p>
              During this meeting, the first leadership team was elected:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Zakayo Kamba – Chairperson</li>
              <li>Magak Ochungo – Secretary</li>
              <li>Elijah Orwa – Treasurer</li>
            </ul>
            <p>
              The very first constitution of the welfare was drafted by the late <b>Paul Magak Ochungo</b>,
              laying down the foundational principles that have guided the association ever since.
            </p>
            <p>
              The welfare’s first fully organized funeral support was for the late Omogo Pius, 
              brother to Otono. From that moment, the association steadily grew in strength 
              and purpose, providing structured support to members during times of need.
            </p>
            <p>
              After years of dedication and persistent advocacy—particularly by the late 
              Elijah Orwa—the welfare was officially registered with the Registrar of Societies 
              in 2009. This milestone marked the transition from an informal community 
              initiative into a recognized institution, ensuring continuity and legitimacy 
              for future generations.
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
