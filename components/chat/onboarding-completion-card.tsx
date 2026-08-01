"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Onboarding Completion Card
 *
 * Warm completion state shown when the onboarding agent calls
 * saveOnboardingProfile. Counts down, then leaves for the living map.
 * "Открыть" skips the wait.
 *
 * The card only signals departure through `onExit` — the surrounding
 * chat owns the closing animation, so the whole conversation fades
 * out together instead of just this card.
 */

const COUNTDOWN_SECONDS = 4;

type OnboardingCompletionCardProps = {
  message?: string;
  /**
   * Called once when the user leaves, by button or by countdown.
   *
   * Omitted where leaving would be wrong — a permalink to a single
   * message, or a conversation reopened after onboarding was already
   * finished. Without it the card is a quiet record of what happened:
   * no countdown, no button, nothing that moves the user.
   */
  onExit?: () => void;
};

export function OnboardingCompletionCard({
  message = "Готово! Добро пожаловать в Orbital.",
  onExit,
}: OnboardingCompletionCardProps) {
  const isInteractive = Boolean(onExit);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [isExiting, setIsExiting] = useState(false);
  const hasExitedRef = useRef(false);

  // Held in a ref, and deliberately kept out of the countdown's deps: the
  // surrounding chat re-renders on every poll, so a callback identity in
  // the deps would restart the timer before it could ever reach zero.
  const onExitRef = useRef(onExit);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  // The ref guard also keeps a double click from firing the exit twice.
  const leave = useCallback(() => {
    if (hasExitedRef.current || !onExitRef.current) {
      return;
    }
    hasExitedRef.current = true;
    setIsExiting(true);
    onExitRef.current();
  }, []);

  useEffect(() => {
    if (!isInteractive) {
      return;
    }

    if (secondsLeft <= 0) {
      leave();
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft, isInteractive, leave]);

  return (
    <div className="relative mt-4">
      {/* Glow ring — the "alive" state tone */}
      <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[36px] bg-gradient-to-br from-emerald-300/70 via-teal-200/30 to-transparent opacity-70 blur-xl" />

      {/* Card. No exit animation of its own — the chat fades as a whole. */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-white/70 bg-white/88 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
        {/* Top highlight line */}
        <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

        {/* Content */}
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Success icon */}
          <div className="relative flex h-12 w-12 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.55)]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-600">
              Профиль сохранён
            </p>
            <p className="text-lg font-medium leading-snug text-neutral-900">
              {message}
            </p>
          </div>

          {/* Action. Only where leaving makes sense. */}
          {isInteractive && (
            <div className="flex w-full flex-col items-center gap-3">
              <Button
                className="w-full rounded-full bg-neutral-900 px-6 font-medium text-sm text-white shadow-lg transition-all hover:bg-neutral-800 hover:shadow-xl"
                disabled={isExiting}
                onClick={leave}
              >
                Открыть
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              {!isExiting && (
                <p className="text-neutral-400 text-xs">
                  Автоматически через {secondsLeft} сек
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
