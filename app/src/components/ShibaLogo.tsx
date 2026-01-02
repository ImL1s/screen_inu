import { motion } from "framer-motion";

/**
 * Brutalist Shiba Logo Component (Animated)
 * Features: Blinking eyes, hover wiggle effect
 */
export const ShibaLogo = () => (
    <motion.svg
        width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#0a0a0a]"
        whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
        transition={{ type: "spring", stiffness: 300 }}
    >
        {/* Head Shape */}
        <path d="M12 16L4 8V24L12 32V40H36V32L44 24V8L36 16H30L24 10L18 16H12Z" fill="#f5f2eb" stroke="currentColor" strokeWidth="3" />

        {/* Eyes - Blinking Animation */}
        <motion.g
            initial={{ scaleY: 1 }}
            animate={{ scaleY: [1, 1, 0.1, 1, 1, 1] }}
            transition={{ repeat: Infinity, duration: 4, times: [0, 0.9, 0.95, 1, 1, 1] }}
            style={{ transformOrigin: "50% 60%" }}
        >
            <rect x="14" y="24" width="4" height="4" fill="#00ff88" stroke="currentColor" strokeWidth="1" />
            <rect x="30" y="24" width="4" height="4" fill="#00ff88" stroke="currentColor" strokeWidth="1" />
        </motion.g>

        {/* Snout */}
        <rect x="22" y="30" width="4" height="4" fill="currentColor" />
        <path d="M22 34H26V36H22V34Z" fill="currentColor" />

        {/* Ears */}
        <path d="M4 8H12V16H4V8Z" fill="#ff6b35" stroke="currentColor" strokeWidth="2" />
        <path d="M36 8H44V16H36V8Z" fill="#ff6b35" stroke="currentColor" strokeWidth="2" />
    </motion.svg>
);
