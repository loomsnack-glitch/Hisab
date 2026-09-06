import {
  BarChart3,
  Check,
  CheckCircle2,
  Headphones,
  MessageCircle,
  Phone,
  Printer,
  Receipt,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";

import { Navbar } from "@/components/landing/navbar";
import CtaButton from "@/components/landing/navbar/cta-button";
import { HeroSection, ScrollFloat, ScrollReveal } from "@/components/landing/hero";

const supportContacts = [
  {
    name: "Dev Jariwala",
    phone: "+91 79901 76865",
    href: "tel:+917990176865",
  },
  {
    name: "Himank Khaptawala",
    phone: "+91 95379 53709",
    href: "tel:+919537953709",
  },
] as const;

const featureCards = [
  {
    icon: Receipt,
    badge: "Fast Checkout",
    title: "Instant Counter Billing",
    description:
      "Rapid touch & barcode checkout engineered for peak rush hours. Print thermal receipts or send digital invoices instantly.",
  },
  {
    icon: Zap,
    badge: "Real-Time Sync",
    title: "Multi-Store Inventory",
    description:
      "Always know what is on shelves. Live stock deductions across all branch counters with automatic low-quantity alerts.",
  },
  {
    icon: MessageCircle,
    badge: "Automated CRM",
    title: "WhatsApp Smart Invoicing",
    description:
      "Automatically deliver branded GST / non-GST bills directly to customer WhatsApp with your payment QR code.",
  },
  {
    icon: BarChart3,
    badge: "Actionable Insights",
    title: "Sales & Cashier Analytics",
    description:
      "Understand top-selling items, peak revenue hours, employee shifts, and profit margins from your phone or desktop.",
  },
  {
    icon: Users,
    badge: "Loyalty & Khata",
    title: "Customer Credit & Ledger",
    description:
      "Track customer balances, credit dues, and loyalty reward points with automated payment reminders.",
  },
  {
    icon: Printer,
    badge: "Hardware Ready",
    title: "Plug & Play Peripherals",
    description:
      "Seamlessly connects with USB, Bluetooth, and LAN thermal receipt printers, electronic weighing scales, and cash drawers.",
  },
];

const pricingPlans = [
  {
    name: "Starter Store",
    price: "₹999",
    period: "/month",
    description: "Ideal for single-counter retail shops, cafes, and boutique outlets.",
    features: [
      "1 Store with unlimited billing",
      "Up to 2 POS cashier devices",
      "Full catalog & inventory management",
      "Thermal printer & barcode scanner sync",
      "Daily sales summary reports",
      "WhatsApp digital receipt delivery",
    ],
    popular: false,
  },
  {
    name: "Growth Pro",
    price: "₹1,999",
    period: "/month",
    description: "Designed for high-volume stores, busy restaurants, and growing retailers.",
    features: [
      "Up to 3 Stores with centralized catalog",
      "Unlimited cashier devices & tablets",
      "Real-time multi-location inventory",
      "Kitchen Display System (KDS) & KOT",
      "Customer Khata & credit management",
      "Automated WhatsApp promotion broadcasts",
      "Dedicated priority telephone support",
    ],
    popular: true,
  },
  {
    name: "Multi-Chain Enterprise",
    price: "Custom",
    period: "",
    description: "Tailored for retail chains, franchise networks, and enterprise operations.",
    features: [
      "Unlimited stores & warehouse hubs",
      "Inter-store stock transfers & audits",
      "Custom ERP & accounting integrations",
      "Dedicated account manager & SLA",
      "Custom invoice templates & branding",
      "On-site deployment & team training",
    ],
    popular: false,
  },
];

const LandingPage = () => {
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-background font-sans text-foreground selection:bg-[#0C73FE]/20 selection:text-[#0C73FE] scroll-smooth">
      {/* Background ambient lighting effects */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-[#0C73FE]/10 blur-[130px] dark:bg-[#0C73FE]/15" />
        <div className="absolute -right-32 top-60 h-[450px] w-[450px] rounded-full bg-[#38BDF8]/10 blur-[140px] dark:bg-[#0C73FE]/10" />
        <div className="absolute left-1/3 top-[900px] h-[600px] w-[600px] rounded-full bg-[#0C73FE]/5 blur-[160px]" />
        <div className="grid-bg absolute inset-0 opacity-[0.25] dark:opacity-[0.08]" />
      </div>

      {/* Premium Animated Responsive Navbar */}
      <Navbar />

      <main>
        {/* COMPLETE IMMERSIVE HERO SECTION */}
        <HeroSection />

        {/* FEATURES SECTION (#features) */}
        <section id="features" className="relative mx-auto mt-20 w-full max-w-7xl px-4 sm:mt-28 sm:px-6 lg:px-8 scroll-mt-28">
          <div className="text-center">
            <Badge variant="outline" className="rounded-full border-[#0C73FE]/25 bg-[#0C73FE]/10 px-3.5 py-1 text-xs font-semibold text-[#0C73FE] dark:border-[#38BDF8]/30 dark:bg-[#38BDF8]/15 dark:text-[#38BDF8]">
              Engineered For Reliability
            </Badge>
            <div className="mt-3">
              <ScrollFloat as="h2" className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Everything your retail store needs to thrive.
              </ScrollFloat>
            </div>
            <ScrollReveal delay={0.1}>
              <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
                Powerful POS capabilities crafted without complexity. Fast checkout, smart inventory, and automated customer engagement built right in.
              </p>
            </ScrollReveal>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="group relative rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#0C73FE]/40 hover:shadow-[0_16px_32px_-8px_rgba(12,115,254,0.15)] dark:hover:shadow-[0_16px_32px_-8px_rgba(12,115,254,0.25)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[#0C73FE]/10 text-[#0C73FE] transition-all duration-300 group-hover:scale-110 group-hover:bg-[#0C73FE] group-hover:text-white dark:bg-[#38BDF8]/15 dark:text-[#38BDF8]">
                      <Icon className="size-6" />
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold tracking-tight text-foreground group-hover:text-[#0C73FE] transition-colors">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* SOLUTIONS SECTION (#solutions) */}
        <section id="solutions" className="relative mx-auto mt-24 w-full max-w-7xl px-4 sm:mt-32 sm:px-6 lg:px-8 scroll-mt-28">
          <div className="rounded-3xl border border-[#0C73FE]/15 bg-gradient-to-b from-[#0C73FE]/[0.03] to-transparent p-8 sm:p-12">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0C73FE] dark:text-[#38BDF8]">
                  Built For Your Business Type
                </p>
                <div className="mt-2 text-left">
                  <ScrollFloat as="h2" className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl justify-start text-left">
                    Whether 1 counter or 50 stores, Ganatri scales with you.
                  </ScrollFloat>
                </div>
                <ScrollReveal delay={0.1}>
                  <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                    From lightning-speed grocery barcode scanning to restaurant kitchen ticketing and multi-location chain distribution, Ganatri adapts seamlessly.
                  </p>
                </ScrollReveal>

                <div className="mt-6 flex flex-col gap-3">
                  {[
                    "Supermarkets & Groceries: Barcode scanning & weighing machine integration",
                    "Cafes & QSR: KOT printing, split tables & token displays",
                    "Bakeries & Sweet Marts: Batch expiries & daily production counts",
                    "Chain Stores: Centralized price master & inter-store stock transfers",
                  ].map((sol, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                      <CheckCircle2 className="size-4.5 text-[#0C73FE] shrink-0 dark:text-[#38BDF8]" />
                      <span>{sol}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-background/90 p-6 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[#0C73FE] text-white font-bold">
                    G
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Ready to upgrade your store?</h4>
                    <p className="text-xs text-muted-foreground">Setup takes under 10 minutes with our team.</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm dark:bg-zinc-900">
                    <span className="font-medium text-foreground">Data Migration Assistance</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Free</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm dark:bg-zinc-900">
                    <span className="font-medium text-foreground">Hardware Pairing Support</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Included</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm dark:bg-zinc-900">
                    <span className="font-medium text-foreground">Staff Training</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Unlimited</span>
                  </div>
                </div>

                <div className="mt-6">
                  <CtaButton href="/register" size="mobile">
                    Get Started Free
                  </CtaButton>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING SECTION (#pricing) */}
        <section id="pricing" className="relative mx-auto mt-24 w-full max-w-7xl px-4 sm:mt-32 sm:px-6 lg:px-8 scroll-mt-28">
          <div className="text-center">
            <Badge variant="outline" className="rounded-full border-[#0C73FE]/25 bg-[#0C73FE]/10 px-3.5 py-1 text-xs font-semibold text-[#0C73FE] dark:border-[#38BDF8]/30 dark:bg-[#38BDF8]/15 dark:text-[#38BDF8]">
              Simple, Transparent Pricing
            </Badge>
            <div className="mt-3">
              <ScrollFloat as="h2" className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Predictable plans. Zero hidden charges.
              </ScrollFloat>
            </div>
            <ScrollReveal delay={0.1}>
              <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
                Invest in reliable software that keeps your cash counters running smoothly every single day.
              </p>
            </ScrollReveal>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {pricingPlans.map((plan, idx) => (
              <div
                key={idx}
                className={`relative flex flex-col justify-between rounded-3xl p-7 transition-all duration-300 ${
                  plan.popular
                    ? "border-2 border-[#0C73FE] bg-card shadow-[0_20px_50px_rgba(12,115,254,0.18)] dark:border-[#38BDF8] dark:shadow-[0_20px_50px_rgba(12,115,254,0.3)]"
                    : "border border-border/80 bg-card/70 hover:border-border"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#0C73FE] to-[#1D4ED8] px-3.5 py-1 text-xs font-bold text-white shadow-md">
                    Most Popular
                  </span>
                )}

                <div>
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {plan.description}
                  </p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-extrabold text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {plan.period}
                    </span>
                  </div>

                  <div className="my-6 h-px w-full bg-border/60" />

                  <ul className="space-y-3 text-sm">
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2.5">
                        <Check className="size-4 shrink-0 text-[#0C73FE] dark:text-[#38BDF8] mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  {plan.popular ? (
                    <CtaButton href="/register" size="mobile">
                      Choose {plan.name}
                    </CtaButton>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-11 rounded-xl text-sm font-semibold border-border hover:border-[#0C73FE]/50"
                      render={<Link to="/register" />}
                    >
                      Choose {plan.name}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SUPPORT CONTACTS SECTION (#support) */}
        <section id="support" className="relative mx-auto mt-24 w-full max-w-7xl px-4 sm:mt-32 sm:px-6 lg:px-8 scroll-mt-28">
          <div className="border-t border-border/60 pt-10 sm:pt-14">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0C73FE] dark:text-[#38BDF8]">
                  Need help?
                </p>
                <div className="mt-1 text-left">
                  <ScrollFloat as="h2" className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl justify-start text-left">
                    Talk to our engineering & support team
                  </ScrollFloat>
                </div>
                <ScrollReveal delay={0.1}>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                    Call either contact below for immediate assistance with your Ganatri store setup, printer pairing, or data import.
                  </p>
                </ScrollReveal>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[#0C73FE]/10 text-[#0C73FE] dark:bg-[#38BDF8]/15 dark:text-[#38BDF8]">
                <Headphones className="size-6" />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {supportContacts.map((contact) => (
                <Card key={contact.phone} className="border-border/70 bg-card/80 transition-all hover:border-[#0C73FE]/30">
                  <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-foreground text-base">{contact.name}</p>
                      <a
                        href={contact.href}
                        className="mt-1 inline-block text-sm text-muted-foreground transition-colors hover:text-[#0C73FE] dark:hover:text-[#38BDF8]"
                      >
                        {contact.phone}
                      </a>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full rounded-xl sm:w-auto hover:border-[#0C73FE]/50"
                      render={<a href={contact.href} aria-label={`Call ${contact.name}`} />}
                    >
                      <Phone className="size-4 text-[#0C73FE] dark:text-[#38BDF8]" />
                      Call now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-16 border-t border-border/60 py-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Ganatri</span>
              <span>by Loomsnack Technologies</span>
              <span>— © {new Date().getFullYear()}</span>
            </div>
            <p>Built for simple, high-speed, everyday retail operations.</p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;
