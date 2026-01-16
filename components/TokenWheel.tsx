"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { convertLogprobsToWedges, formatTokenForDisplay } from "@/lib/utils";

// Color palette for wheel wedges (high contrast, accessible)
const WEDGE_COLORS = [
  "#3B82F6", // blue-500
  "#10B981", // emerald-500
  "#F59E0B", // amber-500
  "#EF4444", // red-500
  "#8B5CF6", // violet-500
  "#EC4899", // pink-500
  "#06B6D4", // cyan-500
  "#84CC16", // lime-500
  "#F97316", // orange-500
  "#6366F1", // indigo-500
];

interface TokenWheelProps {
  logprobs: Record<string, number>;
  chosenToken: string;
  onTokenSelect: (token: string) => void;
  disabled?: boolean;
}

interface WedgeData {
  token: string;
  probability: number;
  angle: number;
  startAngle: number;
  endAngle: number;
}

/**
 * Creates an SVG arc path for a wheel wedge
 * Handles the special case of near-360-degree wedges (100% probability)
 */
function createWedgePath(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const angle = endAngle - startAngle;

  // For near-full circles (>= 359 degrees), draw a circle
  // SVG arcs can't draw from a point to itself, so we use two semicircles
  if (angle >= 359) {
    return `M ${centerX - radius} ${centerY}
            A ${radius} ${radius} 0 1 1 ${centerX + radius} ${centerY}
            A ${radius} ${radius} 0 1 1 ${centerX - radius} ${centerY} Z`;
  }

  // Convert angles to radians (SVG uses clockwise from 3 o'clock, we want from 12 o'clock)
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;

  const x1 = centerX + radius * Math.cos(startRad);
  const y1 = centerY + radius * Math.sin(startRad);
  const x2 = centerX + radius * Math.cos(endRad);
  const y2 = centerY + radius * Math.sin(endRad);

  // Large arc flag: 1 if angle > 180 degrees
  const largeArcFlag = angle > 180 ? 1 : 0;

  return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
}

/**
 * Calculates the rotation needed to land on a specific wedge
 * The pointer is at the TOP (0 degrees), so we need to rotate the wheel
 * so that the target wedge's center aligns with the top.
 */
function calculateTargetRotation(
  wedges: WedgeData[],
  targetToken: string,
  currentRotation: number
): number {
  const targetWedge = wedges.find((w) => w.token === targetToken);
  if (!targetWedge) {
    console.warn("Target token not found in wedges:", targetToken);
    return currentRotation;
  }

  // Calculate center of the target wedge (in wheel coordinates, starting from top)
  const wedgeCenterAngle = (targetWedge.startAngle + targetWedge.endAngle) / 2;

  // To land at the top (0 degrees), we need to rotate so the wedge center goes to 0
  // Since wedges start from 0 and go clockwise, we rotate by (360 - wedgeCenterAngle)
  // But we also need to account for the current rotation to find the delta
  const normalizedCurrent = currentRotation % 360;
  const targetAngle = 360 - wedgeCenterAngle;

  // Calculate the shortest rotation delta (always go forward)
  let rotationDelta = targetAngle - normalizedCurrent;
  if (rotationDelta <= 0) {
    rotationDelta += 360;
  }

  // Add multiple full rotations for dramatic spin effect (10-13 rotations like v1)
  const minSpins = 10;
  const randomExtraSpins = Math.floor(Math.random() * 3); // 0-2 extra spins
  const totalRotation = 360 * (minSpins + randomExtraSpins) + rotationDelta;

  return currentRotation + totalRotation;
}

export default function TokenWheel({
  logprobs,
  chosenToken,
  onTokenSelect,
  disabled = false,
}: TokenWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [pointerBounce, setPointerBounce] = useState(false);

  // Refs to always access latest values in callbacks (avoids stale closures)
  const chosenTokenRef = useRef(chosenToken);
  const onTokenSelectRef = useRef(onTokenSelect);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Update refs on every render to keep them current
  chosenTokenRef.current = chosenToken;
  onTokenSelectRef.current = onTokenSelect;

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Convert logprobs to wedge data
  const wedges = convertLogprobsToWedges(logprobs);

  // SVG dimensions
  const size = 400;
  const center = size / 2;
  const radius = 170;
  const innerRadius = 45;

  // Handle spin button click
  const handleSpin = useCallback(() => {
    if (isSpinning || disabled) return;

    setIsSpinning(true);
    setSelectedToken(null);
    setPointerBounce(false);

    const targetRotation = calculateTargetRotation(
      wedges,
      chosenTokenRef.current,
      rotation
    );
    setRotation(targetRotation);

    // Wait for animation to complete (4 seconds)
    timeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;

      const token = chosenTokenRef.current;
      setSelectedToken(token);
      setIsSpinning(false);
      setPointerBounce(true);
      onTokenSelectRef.current(token);

      // Reset pointer bounce after animation
      setTimeout(() => {
        if (mountedRef.current) {
          setPointerBounce(false);
        }
      }, 500);
    }, 4000);
  }, [isSpinning, disabled, wedges, rotation]);

  // Handle wedge click (manual selection)
  const handleWedgeClick = useCallback(
    (token: string) => {
      if (isSpinning || disabled) return;
      setSelectedToken(token);
      onTokenSelectRef.current(token);
    },
    [isSpinning, disabled]
  );

  return (
    <div className="flex flex-col items-center gap-4">
      {/* CSS for animations */}
      <style jsx>{`
        @keyframes pulse-glow {
          0%,
          100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }
        @keyframes bounce {
          0%,
          100% {
            transform: translateX(-50%) translateY(0);
          }
          50% {
            transform: translateX(-50%) translateY(8px);
          }
        }
        .pulse-glow {
          animation: pulse-glow 1.5s ease-in-out infinite;
        }
        .pointer-bounce {
          animation: bounce 0.5s ease-out;
        }
      `}</style>

      {/* Wheel Container */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Pointer */}
        <div
          className={`absolute z-10 left-1/2 -translate-x-1/2 -top-1 ${
            pointerBounce ? "pointer-bounce" : ""
          }`}
          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "15px solid transparent",
              borderRight: "15px solid transparent",
              borderTop: "25px solid #e74c3c",
            }}
          />
        </div>

        {/* Wheel SVG */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="drop-shadow-xl"
        >
          {/* Outer ring */}
          <circle
            cx={center}
            cy={center}
            r={radius + 6}
            fill="none"
            stroke="#374151"
            strokeWidth="10"
            className="dark:stroke-zinc-600"
          />

          {/* Spinning wheel group - using CSS transform */}
          <g
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: `${center}px ${center}px`,
              transition: isSpinning
                ? "transform 4s cubic-bezier(0.15, 0.5, 0.2, 1)"
                : "none",
            }}
          >
            {/* Wedges */}
            {wedges.map((wedge, index) => {
              const isSelected = selectedToken === wedge.token;
              const isChosen = wedge.token === chosenToken;
              const color = WEDGE_COLORS[index % WEDGE_COLORS.length];

              // Skip tiny wedges (less than 1 degree)
              if (wedge.angle < 1) return null;

              return (
                <g key={wedge.token}>
                  {/* Wedge path */}
                  <path
                    d={createWedgePath(
                      center,
                      center,
                      radius,
                      wedge.startAngle,
                      wedge.endAngle
                    )}
                    fill={color}
                    stroke="#1F2937"
                    strokeWidth="1.5"
                    style={{
                      filter: isSelected
                        ? "brightness(1.2)"
                        : isChosen
                        ? "brightness(1.1)"
                        : "none",
                      cursor:
                        disabled || isSpinning ? "not-allowed" : "pointer",
                      transition: "filter 0.2s ease",
                    }}
                    onClick={() => handleWedgeClick(wedge.token)}
                    onMouseEnter={(e) => {
                      if (!isSpinning && !disabled) {
                        e.currentTarget.style.filter = "brightness(1.15)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = isSelected
                        ? "brightness(1.2)"
                        : isChosen
                        ? "brightness(1.1)"
                        : "none";
                    }}
                  />

                  {/* Highlight glow for chosen token (AI's pick) */}
                  {isChosen && !isSpinning && (
                    <path
                      d={createWedgePath(
                        center,
                        center,
                        radius,
                        wedge.startAngle,
                        wedge.endAngle
                      )}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="4"
                      className="pulse-glow pointer-events-none"
                    />
                  )}

                  {/* Wedge label (only for wedges > 20 degrees) */}
                  {wedge.angle > 20 && (
                    <text
                      x={
                        center +
                        radius *
                          0.65 *
                          Math.cos(
                            ((wedge.startAngle + wedge.endAngle) / 2 - 90) *
                              (Math.PI / 180)
                          )
                      }
                      y={
                        center +
                        radius *
                          0.65 *
                          Math.sin(
                            ((wedge.startAngle + wedge.endAngle) / 2 - 90) *
                              (Math.PI / 180)
                          )
                      }
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize={wedge.angle > 40 ? 14 : 11}
                      fontWeight="600"
                      className="pointer-events-none select-none"
                      style={{
                        textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                      }}
                    >
                      {formatTokenForDisplay(wedge.token)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Center circle */}
          <circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="#1F2937"
            className="dark:fill-zinc-800"
            stroke="#374151"
            strokeWidth="3"
          />

          {/* Center button */}
          <circle
            cx={center}
            cy={center}
            r={innerRadius - 5}
            fill={isSpinning ? "#4B5563" : "#3B82F6"}
            style={{
              cursor: isSpinning || disabled ? "not-allowed" : "pointer",
              transition: "fill 0.2s ease",
            }}
            onClick={handleSpin}
            onMouseEnter={(e) => {
              if (!isSpinning && !disabled) {
                e.currentTarget.style.fill = "#60a5fa";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.fill = isSpinning ? "#4B5563" : "#3B82F6";
            }}
          />

          {/* Spin text */}
          <text
            x={center}
            y={center}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="16"
            fontWeight="700"
            className="pointer-events-none select-none"
          >
            {isSpinning ? "..." : "SPIN"}
          </text>
        </svg>
      </div>

      {/* Token Legend */}
      <div className="w-full max-w-md">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 text-center">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Highlighted = AI&apos;s choice
          </span>
          {" · "}
          Click a wedge or SPIN
        </div>
        <div className="flex flex-wrap gap-1 justify-center">
          {wedges.slice(0, 8).map((wedge, index) => {
            const isChosen = wedge.token === chosenToken;
            return (
              <button
                key={wedge.token}
                onClick={() => handleWedgeClick(wedge.token)}
                disabled={isSpinning || disabled}
                className={`
                  flex items-center gap-1 px-2 py-1 rounded text-xs
                  transition-all duration-200
                  ${
                    isChosen
                      ? "ring-2 ring-amber-400 ring-offset-1 bg-amber-50 dark:bg-amber-950"
                      : ""
                  }
                  ${
                    selectedToken === wedge.token
                      ? "ring-2 ring-blue-500 ring-offset-1"
                      : ""
                  }
                  ${
                    isSpinning || disabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  }
                `}
              >
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{
                    backgroundColor: WEDGE_COLORS[index % WEDGE_COLORS.length],
                  }}
                />
                <span className="font-mono text-zinc-700 dark:text-zinc-300 truncate max-w-20">
                  {formatTokenForDisplay(wedge.token)}
                </span>
                <span className="text-zinc-400 dark:text-zinc-500">
                  {(wedge.probability * 100).toFixed(0)}%
                </span>
                {isChosen && (
                  <span className="text-amber-500 text-[10px]">AI</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
