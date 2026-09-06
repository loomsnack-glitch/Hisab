import { motion } from "motion/react";
import {
  Barcode,
  Boxes,
  CreditCard,
  IndianRupee,
  Receipt,
  ShoppingBag,
} from "lucide-react";

interface FloatingPosElementsProps {
  mouseParallax?: { x: number; y: number };
}

export const FloatingPosElements = ({
  mouseParallax = { x: 0, y: 0 },
}: FloatingPosElementsProps) => {
  const elements = [
    {
      id: "receipt",
      icon: Receipt,
      label: "Receipt",
      className: "left-[8%] top-[22%] hidden sm:flex",
      duration: 6.5,
      yOffset: [0, -8, 0],
      rotate: [-1, 2, -1],
      parallaxFactor: 0.04,
      size: "size-10",
      iconSize: "size-5",
    },
    {
      id: "rupee",
      custom: true,
      component: (
        <div className="flex size-11 items-center justify-center rounded-2xl border border-[#0C73FE]/25 bg-white/70 shadow-sm backdrop-blur-md dark:border-[#38BDF8]/20 dark:bg-zinc-900/70">
          <IndianRupee className="size-5.5 text-[#0C73FE] dark:text-[#38BDF8]" />
        </div>
      ),
      className: "right-[9%] top-[20%] hidden sm:flex",
      duration: 7.2,
      yOffset: [0, 9, 0],
      rotate: [2, -2, 2],
      parallaxFactor: -0.05,
    },
    {
      id: "barcode",
      icon: Barcode,
      label: "Barcode",
      className: "left-[5%] top-[55%] hidden md:flex",
      duration: 8.0,
      yOffset: [0, -10, 0],
      rotate: [-2, 1, -2],
      parallaxFactor: 0.03,
      size: "size-10",
      iconSize: "size-5",
    },
    {
      id: "inventory",
      icon: Boxes,
      label: "Inventory",
      className: "right-[6%] top-[52%] hidden md:flex",
      duration: 6.8,
      yOffset: [0, 8, 0],
      rotate: [1, -2, 1],
      parallaxFactor: -0.04,
      size: "size-10",
      iconSize: "size-5",
    },
    {
      id: "card",
      icon: CreditCard,
      label: "Card",
      className: "left-[14%] top-[78%] hidden lg:flex",
      duration: 7.5,
      yOffset: [0, -7, 0],
      rotate: [2, -1, 2],
      parallaxFactor: 0.05,
      size: "size-9",
      iconSize: "size-4.5",
    },
    {
      id: "bag",
      icon: ShoppingBag,
      label: "Bag",
      className: "right-[13%] top-[76%] hidden lg:flex",
      duration: 8.4,
      yOffset: [0, 7, 0],
      rotate: [-1, 2, -1],
      parallaxFactor: -0.03,
      size: "size-9",
      iconSize: "size-4.5",
    },
  ];

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      aria-hidden="true"
    >
      {elements.map((el) => {
        const Icon = el.icon;
        const pX = mouseParallax.x * (el.parallaxFactor || 0.03);
        const pY = mouseParallax.y * (el.parallaxFactor || 0.03);

        return (
          <motion.div
            key={el.id}
            animate={{
              y: [el.yOffset[0] + pY, el.yOffset[1] + pY, el.yOffset[2] + pY],
              rotate: el.rotate,
              x: pX,
            }}
            transition={{
              y: {
                repeat: Infinity,
                duration: el.duration,
                ease: "easeInOut",
              },
              rotate: {
                repeat: Infinity,
                duration: el.duration * 1.1,
                ease: "easeInOut",
              },
              x: {
                type: "spring",
                stiffness: 150,
                damping: 25,
              },
            }}
            className={`absolute ${el.className} opacity-30 transition-opacity duration-300 hover:opacity-75 dark:opacity-25 dark:hover:opacity-60`}
          >
            {el.custom ? (
              el.component
            ) : Icon ? (
              <div
                className={`flex ${el.size || "size-10"} items-center justify-center rounded-2xl border border-black/[0.06] bg-white/60 text-zinc-600 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300`}
              >
                <Icon className={el.iconSize || "size-5"} />
              </div>
            ) : null}
          </motion.div>
        );
      })}
    </div>
  );
};

export default FloatingPosElements;
