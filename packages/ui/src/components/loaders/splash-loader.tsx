"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import logo from "@repo/assets/logo.png";

type SplashLoaderProps = {
    durationMs?: number;
    onComplete?: () => void;
};

const SplashLoader = ({ durationMs = 2200, onComplete }: SplashLoaderProps) => {
    const [isExiting, setIsExiting] = useState(false);
    const exitAtMs = Math.max(durationMs - 320, 0);

    useEffect(() => {
        const exitTimer = window.setTimeout(() => setIsExiting(true), exitAtMs);
        const completeTimer = window.setTimeout(() => onComplete?.(), durationMs);

        return () => {
            window.clearTimeout(exitTimer);
            window.clearTimeout(completeTimer);
        };
    }, [durationMs, exitAtMs, onComplete]);

    return (
        <motion.div
            className="splash-screen fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-background"
            initial={{ opacity: 1, scale: 1 }}
            animate={{
                opacity: isExiting ? 0 : 1,
                scale: isExiting ? 1.04 : 1,
            }}
            transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
            aria-label="Loading Ganatri"
            role="status"
        >
            <div className="splash-ambient pointer-events-none absolute inset-0" />
            <motion.div
                className="splash-light-sweep pointer-events-none absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
            />

            <div className="relative z-10 flex flex-col items-center px-6">
                <div className="relative mb-10 flex h-36 w-36 items-center justify-center md:h-40 md:w-40">
                    {[0, 1, 2].map((index) => (
                        <motion.span
                            key={index}
                            className="splash-ripple absolute inset-0 rounded-full border border-primary/30"
                            initial={{ scale: 0.35, opacity: 0.7 }}
                            animate={{ scale: 1.65 + index * 0.2, opacity: 0 }}
                            transition={{
                                duration: 1.6,
                                delay: index * 0.22,
                                repeat: Infinity,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                        />
                    ))}

                    <motion.div
                        className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-primary/20 bg-card/90 shadow-2xl backdrop-blur-md md:h-28 md:w-28"
                        initial={{ opacity: 0, scale: 0.4, rotateY: -90 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        transition={{
                            duration: 0.55,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                        style={{ transformPerspective: 800 }}
                    >
                        <motion.img
                            src={logo}
                            alt="Ganatri"
                            className="h-14 w-14 object-contain md:h-16 md:w-16"
                            initial={{ opacity: 0, filter: "blur(8px)" }}
                            animate={{ opacity: 1, filter: "blur(0px)" }}
                            transition={{ delay: 0.2, duration: 0.45 }}
                        />
                    </motion.div>
                </div>

                <motion.div
                    className="text-center"
                    initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ delay: 0.28, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                    <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.38em] text-primary">Loomsnack</p>
                    <h1 className="splash-shimmer font-display text-5xl font-semibold tracking-tight text-foreground md:text-6xl">
                        Ganatri
                    </h1>
                    <motion.p
                        className="mt-3 text-sm text-muted-foreground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.45, duration: 0.35 }}
                    >
                        Loading your workspace
                    </motion.p>
                </motion.div>

                <motion.div
                    className="mt-10 flex items-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                    aria-hidden
                >
                    {[0, 1, 2].map((index) => (
                        <motion.span
                            key={index}
                            className="h-2 w-2 rounded-full bg-primary"
                            animate={{ scale: [1, 1.45, 1], opacity: [0.35, 1, 0.35] }}
                            transition={{
                                duration: 0.9,
                                repeat: Infinity,
                                delay: index * 0.14,
                                ease: "easeInOut",
                            }}
                        />
                    ))}
                </motion.div>
            </div>
        </motion.div>
    );
};

export default SplashLoader;
