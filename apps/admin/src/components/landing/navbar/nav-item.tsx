import React, { useRef, useState } from "react";
import { motion } from "motion/react";
import type { NavItemConfig } from "./nav-data";

interface NavItemProps {
  item: NavItemConfig;
  isActive: boolean;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick?: () => void;
}

export const NavItem = ({
  item,
  isActive,
  isHovered,
  onHover,
  onLeave,
  onClick,
}: NavItemProps) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const [magneticOffset, setMagneticOffset] = useState({ x: 0, y: 0 });

  // Subtle magnetic micro-interaction on desktop
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (!itemRef.current) return;

    const rect = itemRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) * 0.15;
    const deltaY = (e.clientY - centerY) * 0.15;

    // Clamp between -2px and 2px
    const clampedX = Math.max(-2, Math.min(2, deltaX));
    const clampedY = Math.max(-2, Math.min(2, deltaY));

    setMagneticOffset({ x: clampedX, y: clampedY });
  };

  const handleMouseLeave = () => {
    setMagneticOffset({ x: 0, y: 0 });
    onLeave();
  };

  return (
    <div
      ref={itemRef}
      onMouseEnter={onHover}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex items-center"
    >
      <motion.a
        href={item.href}
        onClick={onClick}
        animate={{
          x: magneticOffset.x,
          y: magneticOffset.y - (isHovered ? 1 : 0),
        }}
        transition={{ type: "spring", stiffness: 350, damping: 25, mass: 0.5 }}
        className={`relative flex items-center rounded-full px-4 py-2 text-sm font-medium tracking-tight transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C73FE] ${
          isActive
            ? "font-semibold text-zinc-950 dark:text-white"
            : isHovered
              ? "text-zinc-950 dark:text-white"
              : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
        }`}
      >
        {/* Normal clean shared hover background pill (no gradients, no glow) */}
        {isHovered && (
          <motion.span
            layoutId="navbar-shared-pill"
            className="absolute inset-0 -z-10 rounded-full bg-black/[0.06] dark:bg-white/[0.08]"
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
            }}
          />
        )}

        <span className="relative z-10">{item.label}</span>
      </motion.a>
    </div>
  );
};

export default NavItem;
