import { motion } from "motion/react";

interface ScrollFloatProps {
  children: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4";
}

export const ScrollFloat = ({
  children,
  className = "",
  as: Component = "h2",
}: ScrollFloatProps) => {
  const words = children.split(" ");

  return (
    <Component className={`inline-flex flex-wrap items-center justify-center gap-x-[0.28em] ${className}`}>
      {words.map((word, wordIdx) => (
        <motion.span
          key={wordIdx}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{
            duration: 0.55,
            delay: wordIdx * 0.04,
            ease: [0.215, 0.61, 0.355, 1],
          }}
          className="inline-block"
        >
          {word}
        </motion.span>
      ))}
    </Component>
  );
};

export default ScrollFloat;
