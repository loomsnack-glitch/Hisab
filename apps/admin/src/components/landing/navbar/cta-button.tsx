import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";

interface CtaButtonProps {
  href?: string;
  className?: string;
  size?: "default" | "sm" | "lg" | "mobile";
  children?: React.ReactNode;
}

export const CtaButton = ({
  href = "/register",
  className = "",
  size = "default",
  children,
}: CtaButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const sizeClasses = {
    sm: "h-9 px-4 text-xs",
    default: "h-[42px] px-5 text-sm",
    lg: "h-12 px-7 text-base font-semibold",
    mobile: "h-12 w-full px-6 text-base font-semibold",
  }[size];

  return (
    <motion.div
      className={`relative inline-flex ${size === "mobile" ? "w-full" : ""}`}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Link
        to={href}
        className={`group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl font-medium tracking-tight text-white transition-shadow duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C73FE] focus-visible:ring-offset-2 ${sizeClasses} ${className}`}
        style={{
          background: "linear-gradient(135deg, #0C73FE 0%, #1754E8 50%, #0F3FCB 100%)",
          boxShadow: isHovered
            ? "0 8px 24px -4px rgba(12, 115, 254, 0.45), 0 2px 8px -2px rgba(12, 115, 254, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4)"
            : "0 4px 14px -2px rgba(12, 115, 254, 0.3), 0 1px 3px 0 rgba(12, 115, 254, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.3)",
        }}
      >
        {/* Subtle inner top highlight border */}
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
          aria-hidden="true"
        />

        {/* Ambient border gradient highlight */}
        <span
          className="pointer-events-none absolute inset-0 rounded-xl border border-white/20 transition-opacity duration-300 group-hover:border-white/35"
          aria-hidden="true"
        />

        {/* Occasional discrete shimmer beam passing through */}
        <motion.span
          className="pointer-events-none absolute -inset-full w-[200%] rotate-45 bg-gradient-to-r from-transparent via-white/15 to-transparent"
          animate={{
            x: ["-100%", "200%"],
          }}
          transition={{
            repeat: Infinity,
            repeatDelay: 5,
            duration: 1.4,
            ease: "easeInOut",
          }}
          aria-hidden="true"
        />

        <span className="relative z-10 font-semibold tracking-wide">
          {children || "Get Started"}
        </span>

        {/* Micro-animated arrow */}
        <motion.span
          className="relative z-10 inline-flex items-center"
          animate={
            isHovered
              ? { x: 4, rotate: -10 }
              : { x: 0, rotate: 0 }
          }
          transition={{ type: "spring", stiffness: 450, damping: 22 }}
        >
          <ArrowRight className="size-4" />
        </motion.span>
      </Link>
    </motion.div>
  );
};

export default CtaButton;
