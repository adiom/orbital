"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UserSettings = {
  autoArchive?: boolean;
};

const DEFAULT_SETTINGS: UserSettings = {
  autoArchive: true,
};

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);

  // Load settings on mount
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const load = async () => {
      try {
        const res = await fetch("/api/user/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
        }
      } catch {
        // Use defaults on error
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  // Update settings with debounced save
  const updateSettings = useCallback(
    (partial: Partial<UserSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial };

        // Debounce API call
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
          try {
            await fetch("/api/user/settings", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ settings: next }),
            });
          } catch {
            // Silent fail — local state is already updated
          }
        }, 500);

        return next;
      });
    },
    []
  );

  return {
    settings,
    isLoading,
    updateSettings,
    autoArchive: settings.autoArchive ?? true,
  };
}
