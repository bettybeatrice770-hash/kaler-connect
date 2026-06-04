import { lazy, Suspense } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Hero } from "@/components/site/Hero";
import { About } from "@/components/site/About";
import { Skeleton } from "@/components/ui/skeleton";

const Mission = lazy(() => import("@/components/site/Mission").then(m => ({ default: m.Mission })));
const Membership = lazy(() => import("@/components/site/Membership").then(m => ({ default: m.Membership })));
const Eligibility = lazy(() => import("@/components/site/Eligibility").then(m => ({ default: m.Eligibility })));
const Contributions = lazy(() => import("@/components/site/Contributions").then(m => ({ default: m.Contributions })));
const Funds = lazy(() => import("@/components/site/Funds").then(m => ({ default: m.Funds })));
const Leadership = lazy(() => import("@/components/site/Leadership").then(m => ({ default: m.Leadership })));
const Constitution = lazy(() => import("@/components/site/Constitution").then(m => ({ default: m.Constitution })));
const Contact = lazy(() => import("@/components/site/Contact").then(m => ({ default: m.Contact })));
const Footer = lazy(() => import("@/components/site/Footer").then(m => ({ default: m.Footer })));

const SectionFallback = () => (
  <div className="container py-16 space-y-4">
    <Skeleton className="h-8 w-1/3" />
    <Skeleton className="h-4 w-2/3" />
    <Skeleton className="h-48 w-full" />
  </div>
);

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <About />
      <Suspense fallback={<SectionFallback />}>
        <Mission />
        <Membership />
        <Eligibility />
        <Contributions />
        <Funds />
        <Leadership />
        <Constitution />
        <Contact />
        <Footer />
      </Suspense>
    </main>
  );
};

export default Index;
