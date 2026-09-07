import React, { useEffect, useState } from "react";
import { Phone, Copy, Check } from "lucide-react";
import { useTheme } from "next-themes";
import ProfileCard from "@/components/ProfileCard";
import type { TeamMember } from "./team-data";

export interface TeamProfileCardProps {
  member: TeamMember;
  className?: string;
  enableTilt?: boolean;
}

export const TeamProfileCard: React.FC<TeamProfileCardProps> = ({
  member,
  className = "",
  enableTilt = true,
}) => {
  const [copied, setCopied] = useState(false);
  const firstName = member.name.split(" ")[0];
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine current active theme
  const isDark = mounted ? resolvedTheme === "dark" : true;
  const isWhite =
    member.cardVariant === "white" ||
    (member.cardVariant !== "dark" && !isDark);

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(member.phone.replace(/\s+/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const behindGlowColor = isWhite
    ? "rgba(12, 115, 254, 0.2)"
    : member.accent === "cyan"
      ? "rgba(56, 189, 248, 0.45)"
      : member.accent === "blend"
        ? "rgba(129, 140, 248, 0.45)"
        : "rgba(12, 115, 254, 0.45)";

  const innerGradient = isWhite
    ? "linear-gradient(160deg, #FFFFFF 0%, rgba(240, 249, 255, 0.85) 45%, #FFFFFF 100%)"
    : member.accent === "cyan"
      ? "linear-gradient(155deg, rgba(56, 189, 248, 0.14) 0%, rgba(12, 115, 254, 0.05) 40%, rgba(6, 11, 22, 0.98) 100%)"
      : member.accent === "blend"
        ? "linear-gradient(155deg, rgba(129, 140, 248, 0.15) 0%, rgba(56, 189, 248, 0.05) 40%, rgba(6, 11, 22, 0.98) 100%)"
        : "linear-gradient(155deg, rgba(12, 115, 254, 0.16) 0%, rgba(56, 189, 248, 0.05) 40%, rgba(6, 11, 22, 0.98) 100%)";

  return (
    <div className={`flex flex-col items-center w-full max-w-[340px] ${className}`.trim()}>
      {/* 1. PROFILE CARD (Crisp, with 3D tilt and clear headroom) */}
      <div
        className="w-full flex justify-center cursor-pointer transition-transform duration-200 hover:scale-[1.01]"
        onClick={() => {
          window.location.href = member.tel;
        }}
        title={`Call ${member.name}`}
      >
        <ProfileCard
          name={member.name}
          title={member.role}
          handle={member.id}
          status={member.status}
          contactText={`Call ${firstName}`}
          avatarUrl={member.avatar || "/images/team/dev-jariwala-placeholder.svg"}
          showUserInfo={false}
          enableTilt={enableTilt}
          enableMobileTilt={false}
          onContactClick={() => {
            window.location.href = member.tel;
          }}
          behindGlowColor={behindGlowColor}
          iconUrl="/assets/demo/iconpattern.svg"
          behindGlowEnabled={true}
          innerGradient={innerGradient}
          cardVariant={isWhite ? "white" : "dark"}
        />
      </div>

      {/* 2. PREMIUM CONTACT ACTION DOCK */}
      <div className="mt-3.5 w-full max-w-[340px] rounded-2xl border border-black/[0.08] bg-white/90 p-1.5 pl-2.5 sm:pl-3 shadow-sm backdrop-blur-xl transition-all duration-200 hover:border-black/15 hover:shadow-md dark:border-white/[0.1] dark:bg-zinc-900/90 dark:shadow-black/30 dark:hover:border-white/20 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Clickable Phone Chip with Copy Feedback */}
        <button
          type="button"
          onClick={handleCopyPhone}
          title="Click to copy phone number"
          aria-label={`Copy ${member.name}'s phone number ${member.phone}`}
          className="group flex items-center gap-2 sm:gap-2.5 text-left cursor-pointer transition-colors focus-visible:outline-none py-0.5 min-w-0"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0C73FE] transition-all duration-150 group-hover:scale-105 group-hover:bg-[#0C73FE]/15 dark:bg-blue-950/50 dark:text-[#38BDF8] dark:group-hover:bg-[#38BDF8]/20">
            {copied ? (
              <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 animate-in zoom-in-75 duration-150" />
            ) : (
              <Phone className="size-3.5" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-mono text-[11.5px] sm:text-[12px] font-bold tracking-tight text-zinc-900 transition-colors group-hover:text-[#0C73FE] dark:text-zinc-100 dark:group-hover:text-[#38BDF8] truncate">
              {member.phone}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
              {copied ? (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Copied!
                </span>
              ) : (
                <>
                  <Copy className="size-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                  <span className="group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                    Click to copy
                  </span>
                </>
              )}
            </span>
          </div>
        </button>

        {/* Direct Call Button (Tactile, pill-shaped primary action) */}
        <a
          href={member.tel}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0C73FE] hover:bg-[#0060E6] px-3 sm:px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/25 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] shrink-0 whitespace-nowrap cursor-pointer"
          aria-label={`Direct call to ${member.name}`}
        >
          <Phone className="size-3 fill-current" />
          <span>Call {firstName}</span>
        </a>
      </div>
    </div>
  );
};

export default TeamProfileCard;
