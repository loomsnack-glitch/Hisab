"use client";

import React from "react";
import { SUPPORT_TEAM } from "./team-data";
import { TeamProfileCard } from "./team-profile-card";

export const MeetTeamSection: React.FC = () => {
  return (
    <section
      id="support"
      className="relative mx-auto mt-10 w-full max-w-7xl px-4 pb-10 sm:mt-16 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20 scroll-mt-[calc(env(safe-area-inset-top,0px)+5rem)] sm:scroll-mt-28"
    >
      {/* 1. SUBTLE AMBIENT RADIAL BLUE GLOW BEHIND CARDS (Pure CSS radial gradient, zero blur overhead) */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute left-1/2 top-1/2 size-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.10] dark:opacity-[0.14]"
          style={{
            background:
              "radial-gradient(circle, rgba(12, 115, 254, 0.35) 0%, rgba(56, 189, 248, 0.12) 50%, transparent 70%)",
          }}
        />
      </div>

      <div className="border-t border-border/60 pt-6 sm:pt-10">
        {/* 2. SECTION HEADER */}
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h2 className="font-display font-black tracking-[-0.03em] text-zinc-950 dark:text-white text-3xl sm:text-5xl lg:text-6xl leading-[1.08] sm:leading-[1.05]">
            Support Team
          </h2>
        </div>

        {/* 3. THREE DEVELOPER PROFILE CARDS (Clean, instant rendering) */}
        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3 justify-items-center sm:mt-16">
          {SUPPORT_TEAM.map((member) => (
            <div
              key={member.id}
              className="w-full flex justify-center"
            >
              <TeamProfileCard member={member} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MeetTeamSection;
