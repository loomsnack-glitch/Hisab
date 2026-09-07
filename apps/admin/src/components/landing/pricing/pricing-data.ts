export interface PricingPlan {
  id: "core" | "pro" | "custom";
  name: string;
  badge?: string;
  popular?: boolean;
  price: string;
  period: string;
  valueLine?: string;
  savings?: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  ctaVariant: "primary" | "secondary" | "outline";
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "core",
    name: "Core",
    price: "₹2,999",
    period: "/ year",
    description: "Everything you need to get started.",
    features: [
      "Billing & Invoicing",
      "Menu Management",
      "Reports & Analytics",
      "Menu Setup & Training",
      "Unlimited Users & Terminals",
      "Unlimited Visits Under 24 Hours",
      "24/7 Online Support",
      "Token Management System",
      "Customer Entry Details",
      "User Roles & Permissions",
    ],
    ctaLabel: "Choose Core",
    ctaHref: "/register",
    ctaVariant: "secondary",
  },
  {
    id: "pro",
    name: "Pro",
    badge: "BEST VALUE",
    popular: true,
    price: "₹4,999",
    period: "/ year",
    valueLine: "₹5,999 value",
    savings: "Save ₹1,000",
    description: "Everything in Core, plus advanced business tools.",
    features: [
      "Everything in Core included",
      "Table Management",
      "KOT System",
      "Purchases & Expenses",
      "Payroll",
    ],
    ctaLabel: "Choose Pro",
    ctaHref: "/register",
    ctaVariant: "primary",
  },
  {
    id: "custom",
    name: "Custom",
    price: "Custom pricing",
    period: "",
    description:
      "Need a setup tailored to your business? Build a plan around your requirements.",
    features: [
      "Tailored to your business requirements",
      "Custom modules & workflow setup",
      "Custom onboarding & staff training",
      "Flexible multi-branch configuration",
      "Dedicated account manager & SLA",
    ],
    ctaLabel: "Talk to Sales",
    ctaHref: "#support",
    ctaVariant: "outline",
  },
];

export interface TrustItem {
  icon: "setup" | "users" | "support";
  title: string;
  subtitle: string;
}

export const TRUST_ITEMS: TrustItem[] = [
  {
    icon: "setup",
    title: "Setup & Training Included",
    subtitle: "Complete onboarding support for your entire team",
  },
  {
    icon: "users",
    title: "Unlimited Users & Terminals",
    subtitle: "Add as many cashiers and devices as you need",
  },
  {
    icon: "support",
    title: "24/7 Online Support",
    subtitle: "Always available telephone and remote assistance",
  },
];
