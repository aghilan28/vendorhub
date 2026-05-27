import type { Variants } from "framer-motion";

export const motionTimings = {
  instant: 0.08,
  fast: 0.14,
  base: 0.2,
  slow: 0.32,
} as const;

export const easeStandard = [0.2, 0, 0, 1] as const;

export const fadePreset: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: motionTimings.base, ease: easeStandard } },
  exit: { opacity: 0, transition: { duration: motionTimings.fast, ease: easeStandard } },
};

export const slidePreset: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: motionTimings.base, ease: easeStandard } },
  exit: { opacity: 0, y: 8, transition: { duration: motionTimings.fast, ease: easeStandard } },
};

export const scalePreset: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: { duration: motionTimings.base, ease: easeStandard } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: motionTimings.fast, ease: easeStandard } },
};

export const staggerPreset = {
  visible: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
} satisfies Variants;

export const modalTransition = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: motionTimings.base, ease: easeStandard },
} as const;

export const sheetTransition = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 16 },
  transition: { duration: motionTimings.base, ease: easeStandard },
} as const;

export const toastTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: motionTimings.fast, ease: easeStandard },
} as const;

export const pageTransition = slidePreset;
