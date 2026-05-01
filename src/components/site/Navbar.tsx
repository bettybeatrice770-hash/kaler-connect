import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { href: "#about", label: "About" },
  { href: "#mission", label: "Mission" },
  { href: "#membership", label: "Membership" },
  { href: "#contributions", label: "Contributions" },
  { href: "#contact", label: "Contact" },
];

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
      <nav className="container flex items-center justify-between h-16">
        <a href="#top" className="flex items-center gap-2">
          <span className="h-9 w-9 rounded-md bg-gradient-gold grid place-items-center font-display text-primary font-bold shadow-gold">
            K
          </span>
          <div className="leading-tight">
            <p className="font-display font-semibold text-primary text-sm sm:text-base">Kaler Nairobi</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground tracking-wider uppercase">Welfare Association</p>
          </div>
        </a>
        <ul className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden lg:block">
          <Button variant="hero" asChild>
            <a href="#join">Become a Member</a>
          </Button>
        </div>
        <button className="lg:hidden text-primary" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </nav>
      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <ul className="container py-4 space-y-3">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className="block py-2 text-foreground/80">
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <Button variant="hero" className="w-full" asChild>
                <a href="#join" onClick={() => setOpen(false)}>Become a Member</a>
              </Button>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};
