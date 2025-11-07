"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConstelaNetwork } from "./constela-network";

type ConstelaSummary = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  role: string;
  updatedAt: string;
};

type ForkRelationship = {
  parentSferaId: string;
  forkedSferaId: string;
  createdAt: string;
};

type FetchState = {
  isLoading: boolean;
  constelas: ConstelaSummary[];
  relationships: ForkRelationship[];
  query: string;
};

export const ConstelaOverview = () => {
  const router = useRouter();
  const [state, setState] = useState<FetchState>({
    isLoading: true,
    constelas: [],
    relationships: [],
    query: "",
  });

  useEffect(() => {
    const controller = new AbortController();

    const fetchConstelas = async () => {
      try {
        const response = await fetch("/api/sfera", {
          credentials: "include",
          signal: controller.signal,
        });

        if (response.status === 401) {
          router.push("/login");
          return;
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            (payload as { error?: string }).error ||
              "Не удалось загрузить чаты Constela"
          );
        }

        const payload = (await response.json()) as {
          sferas?: Array<
            Omit<ConstelaSummary, "updatedAt"> & { updatedAt: string }
          >;
          forkRelationships?: ForkRelationship[];
        };

        setState((prev) => ({
          ...prev,
          constelas: payload.sferas ?? [],
          relationships: payload.forkRelationships ?? [],
          isLoading: false,
        }));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Failed to load constela list", error);
        toast.error("Не удалось загрузить список Constela");
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    fetchConstelas();

    return () => controller.abort();
  }, [router]);

  const filteredConstelas = useMemo(() => {
    const query = state.query.trim().toLowerCase();
    if (!query) {
      return state.constelas;
    }
    return state.constelas.filter((item) =>
      [item.title, item.description ?? ""].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [state.constelas, state.query]);

  const handleCreate = () => {
    router.push("/constela/new");
  };

  const handleOpen = (id: string) => {
    router.push(`/constela/${id}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-semibold text-3xl">Constela</h1>
          <p className="text-muted-foreground">
            Групповые ветвящиеся обсуждения с Авророй. Управляйте чатом,
            создавайте ветки и приглашайте команду.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            className="md:w-64"
            onChange={(event) =>
              setState((prev) => ({ ...prev, query: event.target.value }))
            }
            placeholder="Найти Constela..."
            value={state.query}
          />
          <Button className="gap-2" onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Новая Constela
          </Button>
        </div>
      </header>

      <ConstelaNetwork
        constelas={state.constelas}
        isLoading={state.isLoading}
        relationships={state.relationships}
      />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-xl">Все обсуждения</h2>
          <span className="text-muted-foreground text-sm">
            {filteredConstelas.length} активных
          </span>
        </div>

        {state.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card className="border-dashed" key={`skeleton-${index}`}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-8 w-28" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : filteredConstelas.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-muted/60 border-dashed bg-muted/20 p-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="mt-3 font-medium text-lg">Ничего не найдено</p>
            <p className="text-muted-foreground text-sm">
              Измените запрос или создайте новую ветку обсуждения.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredConstelas.map((constela) => (
              <Card
                className="group flex h-full flex-col border-muted/50 transition hover:border-primary/40 hover:shadow-lg"
                key={constela.id}
              >
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-2 text-lg">
                    <span className="line-clamp-2 leading-tight">
                      {constela.title}
                    </span>
                    <Badge
                      variant={
                        constela.visibility === "public"
                          ? "outline"
                          : "secondary"
                      }
                    >
                      {constela.visibility}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 text-muted-foreground text-sm">
                  <p className="line-clamp-3">
                    {constela.description || "Без описания"}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                      {constela.role}
                    </span>
                    <span>
                      обновлено{" "}
                      {new Date(constela.updatedAt).toLocaleDateString()} в{" "}
                      {new Date(constela.updatedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => handleOpen(constela.id)}
                    variant="outline"
                  >
                    Открыть Constela
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
