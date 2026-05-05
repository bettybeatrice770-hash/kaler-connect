import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, UserCog, ShieldCheck, LogOut, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export const PortalLayout = ({ children }: { children: ReactNode }) => {
  const { signOut, isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/profile", label: "My Profile", icon: UserCog },
    ...(isStaff ? [{ to: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary to-background">
      <header className="border-b border-border bg-background/90 backdrop-blur-md sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-gradient-gold grid place-items-center font-display text-primary font-bold shadow-gold">
              K
            </span>
            <div className="leading-tight hidden sm:block">
              <p className="font-display font-semibold text-primary text-sm">Kaler Nairobi</p>
              <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Member Portal</p>
            </div>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
            <Link to="/" className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-foreground/70 hover:bg-muted">
              <Home className="h-4 w-4" /> Home
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Sign out</span>
            </Button>
          </nav>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
};
