import React from "react";
import { GraduationCap, Users, LifeBuoy } from "lucide-react";
import { TRUST_ITEMS } from "./pricing-data";

export const PricingTrustStrip: React.FC = () => {
  const getIcon = (type: string) => {
    switch (type) {
      case "setup":
        return GraduationCap;
      case "users":
        return Users;
      case "support":
        return LifeBuoy;
      default:
        return LifeBuoy;
    }
  };

  return (
    <div className="mx-auto mt-12 sm:mt-16 w-full max-w-5xl rounded-2xl border border-black/[0.06] bg-black/[0.02] p-4 sm:p-5 backdrop-blur-md dark:border-white/[0.06] dark:bg-white/[0.02]">
      <div className="grid grid-cols-1 divide-y divide-black/[0.06] sm:grid-cols-3 sm:divide-y-0 sm:divide-x dark:divide-white/[0.06]">
        {TRUST_ITEMS.map((item, idx) => {
          const Icon = getIcon(item.icon);
          return (
            <div
              key={idx}
              className={`flex items-center gap-3.5 py-3 sm:py-1 ${
                idx === 0
                  ? "sm:pr-6"
                  : idx === 1
                  ? "sm:px-6"
                  : "sm:pl-6"
              }`}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0C73FE]/10 text-[#0C73FE] dark:bg-[#38BDF8]/15 dark:text-[#38BDF8]">
                <Icon className="size-5" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-foreground">
                  {item.title}
                </div>
                <div className="text-[11px] text-muted-foreground leading-snug">
                  {item.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PricingTrustStrip;
