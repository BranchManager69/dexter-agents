/**
 * Shared Framer Motion animation presets for tool note renderers.
 * 
 * Usage:
 *   import { presets, transitions, variants } from "./motionPresets";
 *   <motion.div {...presets.pulse} />
 *   <motion.div animate={presets.spin.animate} transition={transitions.spinLinear} />
 */

import type { Transition, Variants, MotionProps } from "framer-motion";

// ============================================================================
// TRANSITIONS - Reusable timing configurations
// ============================================================================

export const transitions = {
  /** Standard spring for snappy interactions */
  spring: { type: "spring", stiffness: 300, damping: 20 } as Transition,
  
  /** Bouncy spring for playful effects */
  springBouncy: { type: "spring", stiffness: 400, damping: 10 } as Transition,
  
  /** Smooth ease-out for entrances */
  easeOut: { duration: 0.3, ease: "easeOut" } as Transition,
  
  /** Linear infinite rotation */
  spinLinear: { duration: 2, repeat: Infinity, ease: "linear" } as Transition,
  
  /** Fast spin (1 second) */
  spinFast: { duration: 1, repeat: Infinity, ease: "linear" } as Transition,
  
  /** Slow pulse */
  pulseSlow: { duration: 2, repeat: Infinity } as Transition,
  
  /** Standard pulse */
  pulse: { duration: 1.5, repeat: Infinity } as Transition,
  
  /** Fast pulse for urgency */
  pulseFast: { duration: 0.8, repeat: Infinity } as Transition,
  
  /** Stagger children by 50ms */
  staggerChildren: { staggerChildren: 0.05 } as Transition,
  
  /** Stagger children by 100ms */
  staggerChildrenSlow: { staggerChildren: 0.1 } as Transition,
} as const;

// ============================================================================
// ANIMATION PRESETS - Ready-to-spread motion props
// ============================================================================

export const presets = {
  // --- Spinning / Loading ---
  
  /** Continuous 360° rotation (use for loading spinners) */
  spin: {
    animate: { rotate: 360 },
    transition: transitions.spinLinear,
  },
  
  /** Fast spin (1s per rotation) */
  spinFast: {
    animate: { rotate: 360 },
    transition: transitions.spinFast,
  },
  
  // --- Pulsing / Breathing ---
  
  /** Scale pulse 1 → 1.1 → 1 (attention grabber) */
  pulse: {
    animate: { scale: [1, 1.1, 1] },
    transition: transitions.pulse,
  },
  
  /** Subtle scale pulse 1 → 1.05 → 1 */
  pulseSubtle: {
    animate: { scale: [1, 1.05, 1] },
    transition: transitions.pulse,
  },
  
  /** Strong scale pulse 1 → 1.2 → 1 */
  pulseStrong: {
    animate: { scale: [1, 1.2, 1] },
    transition: transitions.pulse,
  },
  
  /** Opacity fade 0.5 → 1 → 0.5 (processing indicator) */
  fadeGlow: {
    animate: { opacity: [0.5, 1, 0.5] },
    transition: transitions.pulse,
  },
  
  /** Subtle opacity fade 0.7 → 1 → 0.7 */
  fadeGlowSubtle: {
    animate: { opacity: [0.7, 1, 0.7] },
    transition: transitions.pulse,
  },
  
  /** Opacity pulse for text (0.3 → 1 → 0.3) */
  blink: {
    animate: { opacity: [0.3, 1, 0.3] },
    transition: transitions.pulse,
  },
  
  // --- Movement ---
  
  /** Gentle wobble rotation (-10° → 10° → -10° → 0) */
  wobble: {
    animate: { rotate: [0, -10, 10, -10, 0] },
    transition: { duration: 0.5, repeat: Infinity, repeatDelay: 2 },
  },
  
  /** Gentle float up and down */
  float: {
    animate: { y: [0, -5, 0] },
    transition: transitions.pulseSlow,
  },
  
  /** Bounce up and down (more pronounced) */
  bounce: {
    animate: { y: [0, -10, 0] },
    transition: transitions.pulse,
  },
  
  /** Horizontal nudge (for arrows, indicators) */
  nudgeRight: {
    animate: { x: [0, 5, 0] },
    transition: transitions.pulse,
  },
  
  /** Horizontal nudge left */
  nudgeLeft: {
    animate: { x: [0, -5, 0] },
    transition: transitions.pulse,
  },
  
  // --- Entrance Animations ---
  
  /** Fade in from below */
  fadeInUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: transitions.easeOut,
  },
  
  /** Fade in from left */
  fadeInLeft: {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 },
    transition: transitions.easeOut,
  },
  
  /** Fade in from right */
  fadeInRight: {
    initial: { opacity: 0, x: 10 },
    animate: { opacity: 1, x: 0 },
    transition: transitions.easeOut,
  },
  
  /** Scale pop in (for success states) */
  popIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: transitions.spring,
  },
  
  /** Spring pop from zero (for confirmations) */
  springPop: {
    initial: { scale: 0 },
    animate: { scale: 1 },
    transition: transitions.spring,
  },
  
  // --- Progress / Bars ---
  
  /** Animate width from 0 (use with style={{ width: `${percent}%` }}) */
  widthGrow: {
    initial: { width: 0 },
    transition: { duration: 0.5, ease: "easeOut" },
  },
  
  /** Animate scaleX from 0 (for connectors, lines) */
  scaleXGrow: {
    initial: { scaleX: 0 },
    animate: { scaleX: 1 },
    transition: transitions.easeOut,
  },
  
  /** Animate scaleY from 0 (for vertical bars) */
  scaleYGrow: {
    initial: { scaleY: 0 },
    animate: { scaleY: 1 },
    transition: transitions.easeOut,
  },
};

// ============================================================================
// VARIANTS - For parent/child stagger animations
// ============================================================================

export const variants = {
  /** Container that staggers children */
  staggerContainer: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  } as Variants,
  
  /** Child item that fades up */
  staggerItem: {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  } as Variants,
  
  /** Child item that fades from left */
  staggerItemLeft: {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 },
  } as Variants,
  
  /** Child item that scales in */
  staggerItemScale: {
    hidden: { opacity: 0, scale: 0.9 },
    show: { opacity: 1, scale: 1 },
  } as Variants,
} as const;

// ============================================================================
// ANIMATION VALUE GENERATORS - For dynamic animations
// ============================================================================

/**
 * Generate a border color pulse animation
 * @param color - Base color in rgba format (e.g., "16,185,129" for emerald)
 * @param minOpacity - Minimum opacity (default 0.2)
 * @param maxOpacity - Maximum opacity (default 0.5)
 */
export function borderPulse(color: string, minOpacity = 0.2, maxOpacity = 0.5) {
  return {
    animate: {
      borderColor: [
        `rgba(${color},${minOpacity})`,
        `rgba(${color},${maxOpacity})`,
        `rgba(${color},${minOpacity})`,
      ],
    },
    transition: transitions.pulse,
  };
}

/**
 * Generate a box shadow glow pulse
 * @param color - Base color in rgba format
 * @param minSize - Minimum shadow size (default 0)
 * @param maxSize - Maximum shadow size (default 20)
 */
export function shadowPulse(color: string, minSize = 0, maxSize = 20) {
  return {
    animate: {
      boxShadow: [
        `0 0 ${minSize}px 0 rgba(${color},0.2)`,
        `0 0 ${maxSize}px 0 rgba(${color},0.4)`,
        `0 0 ${minSize}px 0 rgba(${color},0.2)`,
      ],
    },
    transition: transitions.pulseSlow,
  };
}

/**
 * Generate staggered delay for list items
 * @param index - Item index
 * @param baseDelay - Base delay between items (default 0.05)
 */
export function staggerDelay(index: number, baseDelay = 0.05): Transition {
  return {
    delay: index * baseDelay,
    duration: 0.3,
    ease: "easeOut",
  };
}

/**
 * Generate a confetti-like exit animation for particles
 * @param index - Particle index
 * @param total - Total particles
 */
export function confettiExit(index: number, total: number) {
  return {
    initial: { y: 0, opacity: 1 },
    animate: { y: 100, opacity: 0, rotate: 360 },
    transition: { duration: 1.5, delay: index * 0.05 },
  };
}

// ============================================================================
// COMMON COLOR VALUES - For border/shadow animations
// ============================================================================

export const colors = {
  emerald: "16,185,129",
  cyan: "6,182,212",
  amber: "245,158,11",
  rose: "244,63,94",
  red: "239,68,68",
  violet: "139,92,246",
  fuchsia: "217,70,239",
  blue: "59,130,246",
  yellow: "234,179,8",
  neutral: "115,115,115",
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PresetKey = keyof typeof presets;
export type TransitionKey = keyof typeof transitions;
export type VariantKey = keyof typeof variants;
export type ColorKey = keyof typeof colors;
