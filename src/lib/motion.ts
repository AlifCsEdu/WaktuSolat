export const M3_EASING = {
  emphasized: [0.2, 0.0, 0.0, 1.0] as const,
  emphasizedDecelerate: [0.05, 0.7, 0.1, 1.0] as const,
  emphasizedAccelerate: [0.3, 0.0, 0.8, 0.15] as const,
  standard: [0.2, 0.0, 0, 1.0] as const,
  standardDecelerate: [0, 0, 0, 1] as const,
  standardAccelerate: [0.3, 0, 1, 1] as const,
};

export const M3_MOTION = {
  expressiveSpring: {
    type: "spring" as const,
    stiffness: 450,
    damping: 24,
    mass: 0.9,
  },
  emphasizedEntrance: {
    type: "tween" as const,
    ease: M3_EASING.emphasizedDecelerate,
    duration: 0.5,
  },
  emphasizedExit: {
    type: "tween" as const,
    ease: M3_EASING.emphasizedAccelerate,
    duration: 0.2,
  },
  standardEntrance: {
    type: "tween" as const,
    ease: M3_EASING.standardDecelerate,
    duration: 0.3,
  },
  standardExit: {
    type: "tween" as const,
    ease: M3_EASING.standardAccelerate,
    duration: 0.2,
  },
};

export const modalVariants = {
  hidden: { 
    opacity: 0, 
    y: 40,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: M3_MOTION.expressiveSpring
  },
  exit: { 
    opacity: 0, 
    y: 20,
    scale: 0.95,
    transition: M3_MOTION.emphasizedExit
  }
};

export const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.4, ease: M3_EASING.emphasizedDecelerate }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2, ease: M3_EASING.emphasizedAccelerate }
  }
};
