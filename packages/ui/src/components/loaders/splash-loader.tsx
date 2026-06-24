"use client"

import { motion } from "motion/react"
import logo from "@repo/assets/logo.png"

const SplashLoader = () => {
    return (
        <div
            className="flex flex-col items-center justify-center h-screen w-screen bg-background overflow-hidden relative"
            aria-label="Loading BoxMap"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                    duration: 0.8,
                    ease: [0, 0.71, 0.2, 1.01],
                    scale: {
                        type: "spring",
                        damping: 10,
                        stiffness: 100,
                        restDelta: 0.001
                    }
                }}
                className="relative z-10 flex flex-col items-center"
            >
                <div className="relative">
                    <motion.img
                        src={logo}
                        alt="BoxMap Logo"
                        className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-2xl"
                        initial={{ y: -20 }}
                        animate={{ y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    />

                    {/* Optional: Add a subtle glow/pulse behind or on the logo if desired, 
                        but 'clean' usually means no extra glows for this style. */}
                </div>

                <motion.div
                    className="mt-6 flex flex-col items-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                >
                    <div className="text-5xl md:text-6xl font-bold tracking-tighter flex items-center justify-center text-foreground">
                        <motion.span
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.4 }}
                        >
                            Box
                        </motion.span>
                        <motion.span
                            className="text-primary"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.4 }}
                        >
                            Map
                        </motion.span>
                    </div>
                </motion.div>
            </motion.div>

            {/* Progress Bar / Loading Indicator - Netflix/Gmail style often has a subtle loader */}
            <motion.div
                className="absolute bottom-20 w-48 h-1.5 bg-muted rounded-full overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
            >
                <motion.div
                    className="h-full bg-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{
                        duration: 2,
                        ease: "easeInOut",
                        repeat: Infinity,
                        repeatType: "loop",
                        repeatDelay: 0.5
                    }}
                />
            </motion.div>

            
            <div className="absolute inset-0 bg-gradient-to-tr from-background/80 via-background/50 to-background/80 pointer-events-none" />
        </div>
    );
};

export default SplashLoader