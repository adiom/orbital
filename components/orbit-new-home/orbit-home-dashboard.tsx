"use client";

import { GitBranch, Sparkles, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useOrbits } from "@/hooks/use-orbits";
import { cn } from "@/lib/utils";
import { SferaNetworkView } from "./sfera-network-view";

export function OrbitHomeDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const { orbits, forkRelationships } = useOrbits();

  const recentOrbits = useMemo(() => {
    return [...orbits]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 4);
  }, [orbits]);

  const forkCount = forkRelationships.length;

  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 px-4 py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        {/* Top bar */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-400 text-xs uppercase tracking-[0.2em]">
              Orbits
            </p>
            <h1 className="mt-1 font-semibold text-2xl text-slate-900">
              Network Home
            </h1>
            <p className="mt-1 max-w-xl text-slate-500 text-sm">
              Центр управления ветвящимися диалогами: орбиты, чаты, контакты и
              AI в одном месте.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
              <Avatar className="h-7 w-7">
                <AvatarFallback>{userInitial}</AvatarFallback>
              </Avatar>
              <span className="text-slate-700 text-xs">
                {session?.user?.name ?? session?.user?.email ?? "Гость"}
              </span>
            </div>
            <Button
              className="rounded-full bg-slate-900 px-4 font-medium text-white text-xs hover:bg-slate-800"
              onClick={() => router.push("/")}
              size="sm"
            >
              Открыть чат
            </Button>
          </div>
        </header>

        {/* Quick actions + search */}
        <Card className="border-slate-200/80 bg-white/80 backdrop-blur">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
              <Sparkles className="h-4 w-4 text-slate-400" />
              <Input
                className="h-7 border-none bg-transparent p-0 text-xs focus-visible:ring-0"
                placeholder="Поиск по орбитам, чатам и участникам..."
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="rounded-full bg-blue-600 px-3 text-white text-xs hover:bg-blue-700"
                onClick={() => router.push("/")}
                size="sm"
              >
                Создать Orbit
              </Button>
              <Button
                className="rounded-full border-slate-200 bg-white px-3 text-xs hover:bg-slate-50"
                onClick={() => router.push("/")}
                size="sm"
                variant="outline"
              >
                Новый чат
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main grid */}
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* Center column: network visualization */}
          <div className="flex flex-col gap-4">
            {/* Network visualization */}
            <Card className="border-slate-200/80 bg-white/80 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="font-semibold text-slate-900 text-sm">
                    Сеть Сфер
                  </CardTitle>
                  <p className="mt-1 text-slate-500 text-xs">
                    Визуализация всех орбит и их связей
                  </p>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="font-medium text-slate-700 text-xs">
                    {orbits.length} сфер
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {forkCount} связей
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {orbits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 border-dashed bg-slate-50/60 px-4 py-12 text-center">
                    <GitBranch className="h-8 w-8 text-slate-400" />
                    <p className="font-medium text-slate-800 text-sm">
                      Пока нет сфер
                    </p>
                    <p className="max-w-xs text-slate-500 text-xs">
                      Создайте первую сферу, чтобы начать строить сеть идей и
                      обсуждений
                    </p>
                    <Button
                      className="mt-2 rounded-full bg-blue-600 px-4 text-white text-xs hover:bg-blue-700"
                onClick={() => router.push("/")}
                      size="sm"
                    >
                      Создать первую Сферу
                    </Button>
                  </div>
                ) : (
                  <SferaNetworkView
                    forkRelationships={forkRelationships}
                    orbits={orbits}
                  />
                )}
              </CardContent>
            </Card>

            {/* Recent orbits list */}
            <Card className="border-slate-200/80 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="font-semibold text-slate-900 text-sm">
                  Последние Сферы
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentOrbits.length === 0 ? (
                  <p className="text-slate-500 text-xs">Нет недавних сфер</p>
                ) : (
                  recentOrbits.map((orbit) => (
                    <button
                      className={cn(
                        "hover:-translate-y-[1px] flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2 text-left text-xs transition hover:border-blue-200 hover:bg-blue-50/40"
                      )}
                      key={orbit.id}
                      onClick={() => router.push(`/orbit/${orbit.id}`)}
                      type="button"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="line-clamp-1 font-medium text-[13px] text-slate-900">
                          {orbit.title || "Без названия"}
                        </span>
                        <span className="line-clamp-1 text-[11px] text-slate-500">
                          {orbit.description || "Без описания"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <GitBranch className="h-3.5 w-3.5" />
                        <span>
                          {
                            forkRelationships.filter(
                              (rel) => rel.parentSferaId === orbit.id
                            ).length
                          }
                        </span>
                      </div>
                    </button>
                  ))
                )}
                {orbits.length > 4 && (
                  <Button
                    className="h-7 w-full px-2 text-[11px] text-slate-600 hover:text-slate-900"
                    onClick={() => router.push("/")}
                    size="sm"
                    variant="ghost"
                  >
                    Показать все ({orbits.length})
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column: stats & actions */}
          <div className="flex flex-col gap-4">
            {/* Stats */}
            <Card className="border-slate-200/80 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="font-semibold text-slate-900 text-sm">
                  Статистика
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="font-semibold text-2xl text-blue-900">
                      {orbits.length}
                    </p>
                    <p className="text-blue-700 text-xs">Сфер</p>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-3">
                    <p className="font-semibold text-2xl text-purple-900">
                      {forkCount}
                    </p>
                    <p className="text-purple-700 text-xs">Связей</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card className="border-slate-200/80 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="font-semibold text-slate-900 text-sm">
                  Быстрые действия
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full justify-start rounded-full bg-slate-900 text-white text-xs hover:bg-slate-800"
                  onClick={() => router.push("/")}
                  size="sm"
                >
                  Начать новый чат
                </Button>
                <Button
                  className="w-full justify-start rounded-full border-slate-200 text-slate-700 text-xs hover:bg-slate-50"
                  onClick={() => router.push("/")}
                  size="sm"
                  variant="outline"
                >
                  Все Сферы
                </Button>
              </CardContent>
            </Card>

            {/* AI assistant */}
            <Card className="border-slate-200/80 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="font-semibold text-slate-900 text-sm">
                  AI‑соавтор
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-slate-500 text-xs">
                  Подключайте AI к сферам как полноценного участника для
                  создания артефактов и исследования идей
                </p>
                <Button
                  className="w-full rounded-full bg-purple-600 text-white text-xs hover:bg-purple-700"
                  onClick={() => router.push("/")}
                  size="sm"
                >
                  Начать с AI
                </Button>
              </CardContent>
            </Card>

            {/* Network info */}
            <Card className="border-slate-200/80 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="font-semibold text-slate-900 text-sm">
                  О сети
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 rounded-xl border border-slate-200 border-dashed bg-slate-50/80 px-3 py-3 text-slate-500 text-xs">
                  <Users className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  <span>
                    Сферы связываются через форки, создавая сеть идей и
                    обсуждений
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
