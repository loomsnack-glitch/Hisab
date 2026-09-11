import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero";
import { ProductShowcaseSection } from "@/components/landing/product-showcase";
import { PricingSection } from "@/components/landing/pricing";
import { MeetTeamSection } from "@/components/landing/team";
import { Footer } from "@/components/landing/footer";

const LandingPage = () => {
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-background font-sans text-foreground selection:bg-[#0C73FE]/20 selection:text-[#0C73FE] scroll-smooth">
      {/* Background ambient lighting effects (pure CSS radial gradients - zero blur filter overhead on mobile) */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -left-32 -top-32 h-[550px] w-[550px] rounded-full opacity-60 dark:opacity-40"
          style={{
            background: "radial-gradient(circle, rgba(12, 115, 254, 0.16) 0%, rgba(12, 115, 254, 0.05) 40%, transparent 70%)",
          }}
        />
        <div
          className="absolute -right-24 top-48 h-[500px] w-[500px] rounded-full opacity-50 dark:opacity-30"
          style={{
            background: "radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(12, 115, 254, 0.04) 45%, transparent 70%)",
          }}
        />
        <div
          className="absolute left-1/4 top-[800px] h-[600px] w-[600px] rounded-full opacity-40 dark:opacity-20"
          style={{
            background: "radial-gradient(circle, rgba(12, 115, 254, 0.10) 0%, transparent 65%)",
          }}
        />
        <div className="grid-bg absolute inset-0 opacity-[0.25] dark:opacity-[0.08]" />
      </div>

      {/* Premium Animated Responsive Navbar */}
      <Navbar />

      <main>
        {/* COMPLETE IMMERSIVE HERO SECTION */}
        <HeroSection />

        {/* MAIN PRODUCT SHOWCASE: EVERYTHING IN ONE PLACE */}
        <ProductShowcaseSection />

        {/* PREMIUM PRICING SECTION */}
        <PricingSection />

        {/* NEED HELP? / MEET THE GANATRI TEAM SECTION (#support) */}
        <MeetTeamSection />

        {/* PREMIUM COMPACT FOOTER */}
        <Footer />
      </main>
    </div>
  );
};

export default LandingPage;
