'use client';

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from 'react';
import {
  convertLogprobsToWedges,
  formatTokenForDisplay,
  createWedgePath,
  calculateTargetRotation,
  WedgeData,
} from '@/lib/utils';
import { WEDGE_COLORS } from '@/lib/constants';

export interface TokenWheelHandle {
  triggerWedgeClick: (token: string) => void;
}

interface TokenWheelProps {
  logprobs: Record<string, number>;
  chosenToken: string;
  onTokenSelect: (token: string) => void;
  onSelectedTokenChange?: (token: string | null) => void;
  onWedgesChange?: (wedges: WedgeData[]) => void;
  disabled?: boolean;
  currentPosition?: number;
  totalPositions?: number;
}

const TokenWheel = forwardRef<TokenWheelHandle, TokenWheelProps>(
  (
    {
      logprobs,
      chosenToken,
      onTokenSelect,
      onSelectedTokenChange,
      onWedgesChange,
      disabled = false,
      currentPosition,
      totalPositions,
    },
    ref
  ) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [selectedToken, setSelectedToken] = useState<string | null>(null);
    const [pointerBounce, setPointerBounce] = useState(false);
    const [showResultPopup, setShowResultPopup] = useState(false);
    const [skipAnimation, setSkipAnimation] = useState(false);
    const [targetRotation, setTargetRotation] = useState<number | null>(null);

    // Refs to always access latest values in callbacks (avoids stale closures)
    const chosenTokenRef = useRef(chosenToken);
    const onTokenSelectRef = useRef(onTokenSelect);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const popupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const mountedRef = useRef(true);

    // Update refs on every render to keep them current
    useEffect(() => {
      chosenTokenRef.current = chosenToken;
      onTokenSelectRef.current = onTokenSelect;
    }, [chosenToken, onTokenSelect]);

    // Cleanup on unmount
    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (popupTimeoutRef.current) {
          clearTimeout(popupTimeoutRef.current);
        }
      };
    }, []);

    // Convert logprobs to wedge data (memoized to prevent infinite loops)
    const wedges = useMemo(() => convertLogprobsToWedges(logprobs), [logprobs]);

    // Notify parent of wedges change
    useEffect(() => {
      onWedgesChange?.(wedges);
    }, [wedges, onWedgesChange]);

    // Notify parent of selected token change
    useEffect(() => {
      onSelectedTokenChange?.(selectedToken);
    }, [selectedToken, onSelectedTokenChange]);

    // SVG dimensions
    const size = 400;
    const center = size / 2;
    const radius = 170;
    const innerRadius = 45;

    // Complete spin animation and show popup
    const completeSpinAnimation = useCallback(() => {
      if (!mountedRef.current) return;

      const token = chosenTokenRef.current;
      setSelectedToken(token);
      setIsSpinning(false);
      setShowResultPopup(true);

      // Auto-dismiss popup after 3.5 seconds
      popupTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current && token) {
          setShowResultPopup(false);
          onTokenSelectRef.current(token);
        }
      }, 3500);
    }, []);

    // Dismiss popup and proceed to next step
    const dismissPopupAndProceed = useCallback(() => {
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
        popupTimeoutRef.current = null;
      }
      setShowResultPopup(false);
      if (selectedToken) {
        onTokenSelectRef.current(selectedToken);
      }
    }, [selectedToken]);

    // Skip animation and show result immediately
    const handleSkipAnimation = useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setSkipAnimation(true);

      // Use requestAnimationFrame to ensure skip happens after state update
      requestAnimationFrame(() => {
        if (targetRotation !== null) {
          setRotation(targetRotation);
        }
        // Small delay to let rotation snap into place
        setTimeout(() => {
          if (mountedRef.current) {
            completeSpinAnimation();
          }
        }, 50);
      });
    }, [targetRotation, completeSpinAnimation]);

    // Handle spin button click
    const handleSpin = useCallback(() => {
      if (isSpinning || disabled) return;

      setIsSpinning(true);
      setSelectedToken(null);
      setPointerBounce(false);
      setShowResultPopup(false);
      setSkipAnimation(false);

      const newTargetRotation = calculateTargetRotation(
        wedges,
        chosenTokenRef.current,
        rotation
      );
      setTargetRotation(newTargetRotation);
      setRotation(newTargetRotation);

      // Wait for animation to complete (4 seconds)
      timeoutRef.current = setTimeout(() => {
        completeSpinAnimation();
      }, 4000);
    }, [isSpinning, disabled, wedges, rotation, completeSpinAnimation]);

    // Unified interaction handler for click/space
    const handleInteraction = useCallback(() => {
      if (showResultPopup) {
        dismissPopupAndProceed();
      } else if (isSpinning) {
        handleSkipAnimation();
      } else if (!disabled) {
        handleSpin();
      }
    }, [
      showResultPopup,
      isSpinning,
      disabled,
      dismissPopupAndProceed,
      handleSkipAnimation,
      handleSpin,
    ]);

    // Keyboard event listener for Space key
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && !e.repeat) {
          e.preventDefault();
          handleInteraction();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleInteraction]);

    // Handle wedge click (manual selection) - show confirmation popup
    const handleWedgeClick = useCallback(
      (token: string) => {
        if (isSpinning || disabled) return;
        setSelectedToken(token);
        setShowResultPopup(true);

        // Auto-dismiss and proceed after 3.5s
        popupTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            setShowResultPopup(false);
            onTokenSelectRef.current(token);
          }
        }, 3500);
      },
      [isSpinning, disabled]
    );

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      triggerWedgeClick: handleWedgeClick,
    }));

    return (
      <div className="flex w-full flex-col items-center gap-4 rounded-xl border border-zinc-100 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        {/* Position indicator */}
        {currentPosition !== undefined && totalPositions !== undefined && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Position {currentPosition} of {totalPositions}
          </div>
        )}

        {/* Wheel container */}
        <div className="flex flex-col items-center">
          {/* CSS for animations */}
          <style jsx>{`
            @keyframes bounce {
              0%,
              100% {
                transform: translateX(-50%) translateY(0);
              }
              50% {
                transform: translateX(-50%) translateY(8px);
              }
            }
            .pointer-bounce {
              animation: bounce 0.5s ease-out;
            }
            @keyframes popup {
              0% {
                opacity: 0;
                transform: scale(0.8);
              }
              100% {
                opacity: 1;
                transform: scale(1);
              }
            }
            .animate-popup {
              animation: popup 0.2s ease-out;
            }
          `}</style>

          {/* Wheel Wrapper - contains wheel and popup overlay */}
          <div className="relative" style={{ width: size, height: size }}>
            {/* Wheel Container */}
            <div
              className="absolute inset-0"
              style={{ cursor: isSpinning ? 'pointer' : undefined }}
              onClick={isSpinning ? handleSkipAnimation : undefined}
            >
              {/* Pointer */}
              <div
                className={`absolute -top-1 left-1/2 z-10 -translate-x-1/2 ${
                  pointerBounce ? 'pointer-bounce' : ''
                }`}
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
              >
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '15px solid transparent',
                    borderRight: '15px solid transparent',
                    borderTop: '25px solid #e74c3c',
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
                    transition:
                      isSpinning && !skipAnimation
                        ? 'transform 4s cubic-bezier(0.15, 0.5, 0.2, 1)'
                        : 'none',
                  }}
                >
                  {/* Wedges */}
                  {wedges.map((wedge, index) => {
                    const isSelected = selectedToken === wedge.token;
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
                            filter: isSelected ? 'brightness(1.2)' : 'none',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            transition: 'filter 0.2s ease',
                          }}
                          onClick={() => handleWedgeClick(wedge.token)}
                          onMouseEnter={(e) => {
                            if (!isSpinning && !disabled) {
                              e.currentTarget.style.filter = 'brightness(1.15)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.filter = isSelected
                              ? 'brightness(1.2)'
                              : 'none';
                          }}
                        />

                        {/* Wedge label (only for wedges > 20 degrees) */}
                        {wedge.angle > 20 && (
                          <text
                            x={
                              center +
                              radius *
                                0.65 *
                                Math.cos(
                                  ((wedge.startAngle + wedge.endAngle) / 2 -
                                    90) *
                                    (Math.PI / 180)
                                )
                            }
                            y={
                              center +
                              radius *
                                0.65 *
                                Math.sin(
                                  ((wedge.startAngle + wedge.endAngle) / 2 -
                                    90) *
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
                              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
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
                  fill={isSpinning ? '#4B5563' : '#3B82F6'}
                  style={{
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'fill 0.2s ease',
                  }}
                  onClick={handleSpin}
                  onMouseEnter={(e) => {
                    if (!isSpinning && !disabled) {
                      e.currentTarget.style.fill = '#60a5fa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.fill = isSpinning
                      ? '#4B5563'
                      : '#3B82F6';
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
                  {isSpinning ? '...' : 'SPIN'}
                </text>
              </svg>
            </div>

            {/* Result popup overlay */}
            {showResultPopup && selectedToken && (
              <div
                className="absolute inset-0 z-20 flex cursor-pointer items-center justify-center"
                onClick={dismissPopupAndProceed}
              >
                <div className="animate-popup rounded-xl border-2 border-blue-300 bg-blue-50 p-6 shadow-lg dark:border-blue-700 dark:bg-blue-950">
                  <div className="text-center">
                    <div className="mb-2 text-sm text-blue-600 dark:text-blue-400">
                      Selected Token
                    </div>
                    <div className="font-mono text-3xl font-bold text-blue-800 dark:text-blue-200">
                      {formatTokenForDisplay(selectedToken)}
                    </div>
                    <div className="mt-3 text-xs text-blue-500 dark:text-blue-400">
                      Click or press Space to continue
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Help text */}
        <div className="text-center text-xs text-zinc-500 dark:text-zinc-400">
          {isSpinning
            ? 'Click or press Space to skip'
            : showResultPopup
              ? 'Click or press Space to continue'
              : 'Press Space or click SPIN · Click wedge to select directly'}
        </div>
      </div>
    );
  }
);

TokenWheel.displayName = 'TokenWheel';

export default TokenWheel;
