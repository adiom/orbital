"use client";

import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import type { JSX } from "react";
import { Suspense, useEffect, useState } from "react";
import { MagicLinkForm } from "@/components/magic-link-form";

function LoginContent(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { update: updateSession } = useSession();
  const [loginTriggered, setLoginTriggered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const magicToken = searchParams.get("magic_token");
  const isAutoLogin = Boolean(magicToken);

  useEffect(() => {
    const rawCookies = document.cookie.split(";");

    for (const cookie of rawCookies) {
      const separatorIndex = cookie.indexOf("=");
      const name = (
        separatorIndex > -1 ? cookie.slice(0, separatorIndex) : cookie
      ).trim();

      if (!name) {
        continue;
      }

      // biome-ignore lint/suspicious/noDocumentCookie: Cookie cleanup needed for login page
      document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  }, []);

  useEffect(() => {
    if (magicToken && !loginTriggered) {
      setLoginTriggered(true);

      signIn("credentials", {
        token: magicToken,
        redirect: false,
      })
        .then(async (result) => {
          if (result?.ok) {
            await updateSession();

            try {
              const res = await fetch("/api/onboarding/start", {
                method: "POST",
              });
              const data = await res.json();

              if (data.sferaId) {
                router.push(`/${data.sferaId}`);
              } else {
                router.push("/");
              }
            } catch {
              router.push("/");
            }
          } else {
            console.error("Invalid magic token");
          }
        })
        .catch((error) => {
          console.error("Error verifying magic token:", error);
        });
    }
  }, [magicToken, loginTriggered, updateSession, router]);

  if (isAutoLogin) {
    return (
      <div className="relative flex h-dvh w-screen items-center justify-center overflow-hidden bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Вход...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh w-screen items-start justify-center overflow-hidden bg-background pt-12 md:items-center md:pt-0">
      <motion.div
        animate={{ opacity: isFocused ? 1 : 0.3 }}
        className="absolute z-0 flex h-full w-full items-center justify-center"
        initial={{ opacity: 0 }}
        transition={{
          duration: 0.8,
        }}
      />

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl"
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          animate={{
            borderColor: isFocused ? "#f97316" : "#fed7aa",
            boxShadow: isFocused
              ? "0 20px 25px -5px rgba(249, 115, 22, 0.1), 0 10px 10px -5px rgba(249, 115, 22, 0.04)"
              : "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          }}
          className="relative z-10 rounded-2xl border border-orange-200/50 bg-white/60 p-4 shadow-lg backdrop-blur-sm dark:border-slate-600/50 dark:bg-slate-800/60"
          style={{
            borderWidth: "1px",
            borderStyle: "solid",
          }}
          transition={{
            duration: 0.6,
            delay: 0.1,
          }}
        >
          <MagicLinkForm
            onBlur={() => setIsFocused(false)}
            onFocus={() => setIsFocused(true)}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <LoginContent />
    </Suspense>
  );
}
