import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#0A0A0A", // Obsidian Page Base
                surface: "#111111", // Cards/Surfaces
                border: "#27272A", // Zinc 800 - 1px borders
                hover: "#18181B", // Hover States
                primary: "#0052FF", // Coinbase Blue
                success: "#10B981", // Emerald
                danger: "#EF4444", // Red
                muted: "#71717A", // Zinc 500 for IDs
            },
            fontFamily: {
                sans: ["var(--font-inter)", "sans-serif"],
                mono: ["var(--font-jetbrains-mono)", "monospace"],
            },
            borderColor: {
                DEFAULT: "#27272A",
            },
        },
    },
    plugins: [],
};
export default config;
