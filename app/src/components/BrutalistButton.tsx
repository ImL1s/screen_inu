import { ReactNode } from "react";

interface BrutalistButtonProps {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
    title?: string;
    variant?: "primary" | "secondary" | "accent";
    size?: "sm" | "md" | "lg";
}

/**
 * Neo-Brutalist Button Component
 * Features: Shadow box effect, hover animations
 */
export const BrutalistButton = ({
    children,
    onClick,
    className = "",
    title,
    variant = "secondary",
    size = "md",
}: BrutalistButtonProps) => {
    const sizeClasses = {
        sm: "w-10 h-10",
        md: "w-12 h-12",
        lg: "w-48 h-48",
    };

    const variantClasses = {
        primary: "bg-[#00ff88]",
        secondary: "bg-[#e8e4db] group-hover:bg-[#00ff88]",
        accent: "bg-[#ff6b35] hover:bg-white",
    };

    return (
        <button
            onClick={onClick}
            className={`relative group cursor-pointer focus:outline-none ${className}`}
            title={title}
        >
            {/* Shadow Box */}
            <div className="absolute inset-0 bg-[#0a0a0a] translate-x-1 translate-y-1 transition-transform group-hover:translate-x-1.5 group-hover:translate-y-1.5 pointer-events-none"></div>

            {/* Main Button */}
            <div className={`relative ${sizeClasses[size]} ${variantClasses[variant]} border-2 border-[#0a0a0a] flex items-center justify-center transition-colors`}>
                {children}
            </div>
        </button>
    );
};
