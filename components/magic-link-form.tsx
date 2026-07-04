"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { startTransition, useActionState, useState } from "react";
import {
  type CreateMagicLinkState,
  createMagicLink,
} from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MagicLinkFormProps = {
  onFocus?: () => void;
  onBlur?: () => void;
};

export function MagicLinkForm({ onFocus, onBlur }: MagicLinkFormProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const { update: updateSession } = useSession();
  const router = useRouter();
  const [state, formAction] = useActionState<CreateMagicLinkState, FormData>(
    createMagicLink,
    {
      status: "idle",
    }
  );

  const isSuccess = state.status === "success";
  const isFailed = state.status === "failed";
  const isLoading = state.status === "in_progress";
  const magicLink = state.magicLink;
  const isDev = process.env.NODE_ENV === "development";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("email", email);
    startTransition(() => {
      formAction(formData);
    });
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      return;
    }

    try {
      const response = await fetch("/api/auth/verify-code-direct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (response.ok) {
        await updateSession();
        router.push("/");
      } else {
        console.error(data.error || "Неверный код");
      }
    } catch {
      console.error("Ошибка верификации кода");
    }
  };

  // Показываем ввод кода после создания magic link
  if ((isSuccess || isFailed) && magicLink && !showCodeInput) {
    return (
      <div className="space-y-4 px-4 text-center sm:px-16">
        <div
          className={`rounded-md p-4 ${
            isFailed ? "bg-amber-50 dark:bg-amber-900/20" : "bg-green-50 dark:bg-green-900/20"
          }`}
        >
          <div
            className={`text-sm ${
              isFailed ? "text-amber-800 dark:text-amber-200" : "text-green-700 dark:text-green-200"
            }`}
          >
            {isFailed ? "⚠️ " : "✅ "}
            {state.message || `Код создан для ${email}`}
            {(isDev || isFailed) && (
              <div className="mt-2 font-mono text-xs">
                Код: {magicLink.split("magic_token=")[1]}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Button className="w-full" onClick={() => setShowCodeInput(true)}>
            Ввести код вручную
          </Button>

          <Button
            className="w-full"
            onClick={() => {
              setEmail("");
              setShowCodeInput(false);
              window.location.reload();
            }}
            type="button"
            variant="outline"
          >
            Создать новый код
          </Button>
        </div>
      </div>
    );
  }

  // Форма ввода кода
  if (showCodeInput) {
    return (
      <div className="space-y-4 px-4 sm:px-16">
        <form className="space-y-4" onSubmit={handleCodeSubmit}>
          <div className="space-y-1">
            <Label className="font-medium text-sm" htmlFor="code">
              8-значный код
            </Label>
            <Input
              className="text-center text-lg tracking-widest"
              id="code"
              maxLength={8}
              onChange={(e) => setCode(e.target.value)}
              placeholder="12345678"
              required
              type="text"
              value={code}
            />
          </div>

          <Button className="w-full" type="submit">
            <Loader2
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Войти по коду
          </Button>
        </form>

        <Button
          className="w-full"
          onClick={() => setShowCodeInput(false)}
          type="button"
          variant="outline"
        >
          Назад
        </Button>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="space-y-4 px-4 text-center sm:px-16">
        <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
          <div className="text-green-700 text-sm dark:text-green-200">
            ✅ Magic link создан для {email}
          </div>
        </div>

        

        <Button
          className="w-full"
          onClick={() => {
            setEmail("");
            setShowCodeInput(false);
            window.location.reload();
          }}
          type="button"
          variant="outline"
        >
          Создать новую ссылку
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-4 px-4 sm:px-16" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <Label className="font-medium text-sm" htmlFor="magic-email">
          Электронная почта
        </Label>
        <Input
          autoComplete="email"
          className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          disabled={isLoading}
          id="magic-email"
          name="email"
          onBlur={onBlur}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={onFocus}
          placeholder="your@email.com"
          required
          type="email"
          value={email}
        />
      </div>

      <Button className="w-full" disabled={isLoading} type="submit">
        {isLoading ? "Создание ссылки..." : "Создать Magic Link"}
      </Button>
    </form>
  );
}
