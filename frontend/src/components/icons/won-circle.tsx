import React from "react";

interface WonCircleProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
}

/**
 * Custom WonCircle icon component
 * Displays Korean Won (₩) symbol inside a circle
 */
export const WonCircle: React.FC<WonCircleProps> = ({
    className = "h-5 w-5",
    ...props
}) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {/* Circle */}
            <circle cx="12" cy="12" r="10" />
            {/* Won symbol (₩) as text */}
            <text
                x="12"
                y="16"
                textAnchor="middle"
                fontSize="12"
                fontWeight="bold"
                fill="currentColor"
                stroke="none"
            >
                ₩
            </text>
        </svg>
    );
};

export default WonCircle;
