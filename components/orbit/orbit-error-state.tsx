"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OrbitErrorStateProps = {
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
};

export function OrbitErrorState({
  message = "Не удалось загрузить орбиты",
  onRetry,
  isRetrying = false,
  className,
}: OrbitErrorStateProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-1 flex-col items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-100/60 px-6 text-center",
        className
      )}
    >
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertTriangle className="h-12 w-12" />
      </div>
      <h2 className="mb-3 font-semibold text-2xl text-gray-900">
        Проблема с подключением
      </h2>
      <p className="mb-8 max-w-md text-gray-600">
        {message}
        {!onRetry && " Пожалуйста, попробуйте позже."}
      </p>
      {onRetry && (
        <Button
          className="gap-2 rounded-full bg-red-600 px-8 py-6 text-white shadow-lg transition-all hover:bg-red-700 hover:shadow-xl"
          disabled={isRetrying}
          onClick={onRetry}
        >
          {isRetrying ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Повторяем...
            </span>
          ) : (
            "Повторить"
          )}
        </Button>
      )}
    </div>
  );
}
