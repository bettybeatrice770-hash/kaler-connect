export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground/80 pt-16 pb-8">
      <div className="container grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-gradient-gold grid place-items-center font-display text-primary font-bold shadow-gold">
              K
            </span>
            <div>
              <p className="font-display font-semibold text-primary-foreground">Kaler Nairobi</p>
              <p className="text-xs uppercase tracking-wider text-primary-foreground/60">Welfare Association</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed max-w-md">
            Founded in 1988 by the late Elijah Orwa and fellow elders. Registered with the
            Registrar of Societies, Kenya in 2009. Standing together for Kalerians in Nairobi.
          </p>
        </div>
        <div>
          <p className="font-semibold text-primary-foreground mb-4">Quick Links</p>
          <ul className="space-y-2 text-sm">
            <li><a href="#about" className="hover:text-accent-glow transition-colors">About</a></li>
            <li><a href="#mission" className="hover:text-accent-glow transition-colors">Mission</a></li>
            <li><a href="#membership" className="hover:text-accent-glow transition-colors">Membership</a></li>
            <li><a href="#contributions" className="hover:text-accent-glow transition-colors">Contributions</a></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-primary-foreground mb-4">Important Dates</p>
          <ul className="space-y-2 text-sm">
            <li>Renewal: Feb 28 yearly</li>
            <li>Late fine: Ksh 100</li>
            <li>Cut-off: August</li>
          </ul>
        </div>
      </div>
      <div className="container mt-12 pt-6 border-t border-primary-foreground/10 text-xs text-primary-foreground/50 flex flex-col sm:flex-row gap-3 justify-between">
        <p>© {new Date().getFullYear()} Kaler Nairobi Welfare Association. All rights reserved.</p>
        <p>In loving memory of our founder, the late Elijah Orwa.</p>
      </div>
    </footer>
  );
};
