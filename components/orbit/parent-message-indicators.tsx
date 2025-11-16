"use client";

import { CornerDownRight } from "lucide-react";
import type React from "react";

type ParentMessageInfo = {
  userEmail: string;
  content: string;
};

type IndicatorProps = {
  parentMessage: ParentMessageInfo;
  children: React.ReactNode;
};

// Вариант 1: Боковая линия с точкой
export function Indicator1({ parentMessage, children }: IndicatorProps) {
  return (
    <div className="relative">
      {/* Визуальная связь */}
      <div className="-mt-4 absolute top-0 right-0 flex flex-col items-center">
        {/* Точка-маркер на parent */}
        <div className="h-2 w-2 rounded-full bg-gray-400" />
        {/* Вертикальная линия */}
        <div className="h-8 w-[2px] bg-gray-300" />
        {/* Горизонтальная линия */}
        <div className="h-[2px] w-8 bg-gray-300" />
      </div>

      {/* Маленький badge с информацией о parent */}
      <div className="mb-2 text-gray-500 text-xs">
        <span className="opacity-70">↑ Reply to {parentMessage.userEmail}</span>
      </div>

      {children}
    </div>
  );
}

// Вариант 2: Вертикальная граница с меткой
export function Indicator2({ parentMessage, children }: IndicatorProps) {
  return (
    <div className="relative pl-4">
      {/* Вертикальная линия слева */}
      <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-gray-300" />

      {/* Метка */}
      <div className="mb-2 flex items-center gap-1 text-gray-500 text-xs">
        <CornerDownRight className="h-3 w-3" />
        <span>Reply to {parentMessage.userEmail}</span>
      </div>

      {children}
    </div>
  );
}

// Вариант 3: Curved connecting line (SVG)
export function Indicator3({ parentMessage, children }: IndicatorProps) {
  return (
    <div className="relative">
      {/* SVG curved path */}
      <svg
        className="-top-8 absolute right-4 h-12 w-12"
        fill="none"
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M24 0 C24 20, 24 20, 48 40"
          fill="none"
          stroke="#d1d5db"
          strokeWidth="2"
        />
        {/* Точка на конце */}
        <circle cx="24" cy="0" fill="#9ca3af" r="3" />
        <circle cx="48" cy="40" fill="#9ca3af" r="3" />
      </svg>

      {/* Информация о parent */}
      <div className="mb-2 text-right text-gray-500 text-xs">
        <span className="opacity-70">↑ {parentMessage.userEmail}</span>
      </div>

      {children}
    </div>
  );
}

// Вариант 4: Минимальный индикатор
export function Indicator4({ parentMessage, children }: IndicatorProps) {
  return (
    <div className="relative">
      {/* Компактный badge внутри сообщения */}
      <div className="mb-2 inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-gray-600 text-xs">
        <CornerDownRight className="h-3 w-3" />
        <span>to {parentMessage.userEmail}</span>
      </div>

      {children}
    </div>
  );
}

// Вариант 5: Indent with subtle marker (L-образная линия)
export function Indicator5({ parentMessage, children }: IndicatorProps) {
  return (
    <div className="relative ml-8">
      {/* L-образная линия */}
      <div className="-left-8 absolute top-0 h-full w-8">
        {/* Вертикальная часть */}
        <div className="absolute top-0 left-0 h-8 w-[2px] bg-gray-300" />
        {/* Горизонтальная часть */}
        <div className="absolute top-8 left-0 h-[2px] w-8 bg-gray-300" />
        {/* Точка на сгибе */}
        <div className="-translate-x-1/2 -translate-y-1/2 absolute top-8 left-0 h-2 w-2 rounded-full bg-gray-400" />
      </div>

      {/* Информация о parent */}
      <div className="mb-2 text-gray-500 text-xs">
        <span className="opacity-70">↑ Reply to {parentMessage.userEmail}</span>
      </div>

      {children}
    </div>
  );
}

// Export all variants as named exports
export const ParentIndicators = {
  Variant1: Indicator1,
  Variant2: Indicator2,
  Variant3: Indicator3,
  Variant4: Indicator4,
  Variant5: Indicator5,
};
