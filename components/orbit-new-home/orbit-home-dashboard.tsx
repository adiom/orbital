"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useOrbits } from "@/hooks/use-orbits";
import { cn } from "@/lib/utils";
import { GitBranch, MessageSquare, Sparkles, Users } from "lucide-react";

export function OrbitHomeDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const { orbits, forkRelationships } = useOrbits();

  const recentOrbits = useMemo(() => {
    return [...orbits]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4);
  }, [orbits]);

  const forkCount = forkRelationships.length;

  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 px-4 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {/* Top bar */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Orbits
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              Network Home
            </h1>
            <p className="mt-1 text-sm text-slate-500 max-w-xl">
              Центр управления ветвящимися диалогами: орбиты, чаты, контакты и AI в одном месте.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
              <Avatar className="h-7 w-7">
                <AvatarFallback>{userInitial}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-slate-700">
                {session?.user?.name ?? session?.user?.email ?? "Гость"}
              </span>
            </div>
            <Button
              className="rounded-full bg-slate-900 px-4 text-xs font-medium text-white hover:bg-slate-800"
              size="sm"
              onClick={() => router.push("/")}
            >
              Открыть чат
            </Button>
          </div>
        </header>

        {/* Main grid */}
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
          {/* Center column: activity & orbits */}
          <div className="flex flex-col gap-4">
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
                    className="rounded-full bg-blue-600 px-3 text-xs text-white hover:bg-blue-700"
                    size="sm"
                    onClick={() => router.push("/orbits/new")}
                  >
                    Создать Orbit
                  </Button>
                  <Button
                    className="rounded-full border-slate-200 bg-white px-3 text-xs hover:bg-slate-50"
                    size="sm"
                    variant="outline"
                    onClick={() => router.push("/")}
                  >
                    Новый чат
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Orbits overview */}
            <Card className="border-slate-200/80 bg-white/80 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Ваши Orbits
                  </CardTitle>
                  <p className="mt-1 text-xs text-slate-500">
                    Обзор активных орбит и ветвящихся обсуждений.
                  </p>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-xs font-medium text-slate-700">
                    {orbits.length} orbits
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {forkCount} forks
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentOrbits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
                    <GitBranch className="h-6 w-6 text-slate-400" />
                    <p className="text-sm font-medium text-slate-800">
                      Пока нет орбит
                    </p>
                    <p className="text-xs text-slate-500 max-w-xs">
                      Запустите первую орбиту, чтобы превратить идеи и чаты в ветвящееся пространство.
                    </p>
                    <Button
                      className="mt-1 rounded-full bg-blue-600 px-4 text-xs text-white hover:bg-blue-700"
                      size="sm"
                      onClick={() => router.push("/orbits/new")}
                    >
                      Создать первую Orbit
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentOrbits.map((orbit) => (
                      <button
                        key={orbit.id}
                        type="button"
                        onClick={() => router.push(`/orbit/${orbit.id}`)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2 text-left text-xs transition hover:-translate-y-[1px] hover:border-blue-200 hover:bg-blue-50/40",
                        )}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] font-medium text-slate-900 line-clamp-1">
                            {orbit.title || "Без названия"}
                          </span>
                          <span className="text-[11px] text-slate-500 line-clamp-1">
                            {orbit.description || "Орбита без описания"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <GitBranch className="h-3.5 w-3.5" />
                          <span>веток: {forkRelationships.filter((rel) => rel.parentSferaId === orbit.id).length}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {orbits.length > 0 && (
                  <div className="flex items-center justify-between pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] text-slate-600 hover:text-slate-900"
                      onClick={() => router.push("/orbits")}
                    >
                      Открыть все Orbits
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column: chats & contacts */}
          <div className="flex flex-col gap-4">
            {/* Chats preview */}
            <Card className="border-slate-200/80 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Последние чаты
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-500">
                  Здесь будет список последних диалогов. Сейчас используется общий чатовый интерфейс AVRORA, вы можете начать новый диалог из центра.
                </p>
                <Button
                  className="w-full rounded-full bg-slate-900 text-xs text-white hover:bg-slate-800"
                  size="sm"
                  onClick={() => router.push("/")}
                >
                  Перейти к чатам
                </Button>
              </CardContent>
            </Card>

            {/* Contacts / network */}
            <Card className="border-slate-200/80 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Контакты и сеть
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-3 text-xs text-slate-500">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span>
                    В следующих версиях здесь появится список участников ваших орбит и персональные ветки общения с ними.
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-full border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
                  onClick={() => router.push("/docs")}
                >
                  Узнать больше о Orbits
                </Button>
              </CardContent>
            </Card>

            {/* AI co-pilot */}
            <Card className="border-slate-200/80 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  AI‑соавтор
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-500">
                  Подключайте AI к орбитам как полноценного участника: форкайте сообщения, создавайте артефакты и исследуйте альтернативные ветви обсуждений.
                </p>
                <Button
                  size="sm"
                  className="w-full rounded-full bg-purple-600 text-xs text-white hover:bg-purple-700"
                  onClick={() => router.push("/")}
                >
                  Начать чат с AI
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
