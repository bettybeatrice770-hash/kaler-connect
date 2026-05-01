import { Navbar } from "@/components/site/Navbar";
import { Hero } from "@/components/site/Hero";
import { About } from "@/components/site/About";
import { Mission } from "@/components/site/Mission";
import { Membership } from "@/components/site/Membership";
import { Eligibility } from "@/components/site/Eligibility";
import { Contributions } from "@/components/site/Contributions";
import { Funds } from "@/components/site/Funds";
import { Leadership } from "@/components/site/Leadership";
import { Constitution } from "@/components/site/Constitution";
import { Contact } from "@/components/site/Contact";
import { Footer } from "@/components/site/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <About />
      <Mission />
      <Membership />
      <Eligibility />
      <Contributions />
      <Funds />
      <Leadership />
      <Constitution />
      <Contact />
      <Footer />
    </main>
  );
};

export default Index;
