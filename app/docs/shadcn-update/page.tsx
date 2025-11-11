"use client";

import { AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function ShadcnUpdatePage() {
  const installedComponents = [
    "alert-dialog",
    "avatar",
    "badge",
    "button",
    "card",
    "carousel",
    "collapsible",
    "dialog",
    "dropdown-menu",
    "hover-card",
    "input",
    "label",
    "progress",
    "scroll-area",
    "select",
    "separator",
    "sheet",
    "sidebar",
    "skeleton",
    "textarea",
    "tooltip",
  ];

  const commonShadcnComponents = [
    "accordion",
    "alert",
    "alert-dialog",
    "aspect-ratio",
    "avatar",
    "badge",
    "breadcrumb",
    "button",
    "calendar",
    "card",
    "carousel",
    "chart",
    "checkbox",
    "collapsible",
    "command",
    "context-menu",
    "dialog",
    "drawer",
    "dropdown-menu",
    "form",
    "hover-card",
    "input",
    "input-otp",
    "label",
    "menubar",
    "navigation-menu",
    "pagination",
    "popover",
    "progress",
    "radio-group",
    "resizable",
    "scroll-area",
    "select",
    "separator",
    "sheet",
    "sidebar",
    "skeleton",
    "slider",
    "sonner",
    "switch",
    "table",
    "tabs",
    "textarea",
    "toast",
    "toggle",
    "toggle-group",
    "tooltip",
  ];

  const missingComponents = commonShadcnComponents.filter(
    (comp) => !installedComponents.includes(comp)
  );

  const canUpdate = installedComponents.filter((comp) =>
    commonShadcnComponents.includes(comp)
  );

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-8">
        <h1 className="mb-2 font-bold text-4xl">
          Обновление shadcn/ui компонентов
        </h1>
        <p className="text-lg text-muted-foreground">
          Руководство по обновлению и добавлению компонентов shadcn/ui
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge className="text-sm" variant="secondary">
          {installedComponents.length} установлено
        </Badge>
        <Badge className="text-sm" variant="outline">
          {missingComponents.length} доступно для установки
        </Badge>
        <Badge className="text-sm" variant="default">
          {canUpdate.length} можно обновить
        </Badge>
      </div>

      <Separator className="mb-8" />

      {/* Как обновить компоненты */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Как обновить компоненты</CardTitle>
          <CardDescription>
            Используйте shadcn CLI для обновления существующих компонентов
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2 font-semibold">Обновить один компонент:</h3>
            <div className="rounded-md bg-muted p-4 font-mono text-sm">
              <code>npx shadcn@latest add [component-name] --overwrite</code>
            </div>
            <p className="mt-2 text-muted-foreground text-sm">
              Флаг <code className="rounded bg-muted px-1">--overwrite</code>{" "}
              перезапишет существующий компонент
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2 font-semibold">
              Обновить несколько компонентов:
            </h3>
            <div className="rounded-md bg-muted p-4 font-mono text-sm">
              <code>npx shadcn@latest add button card dialog --overwrite</code>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2 font-semibold">
              Обновить все компоненты (скрипт):
            </h3>
            <div className="rounded-md bg-muted p-4 font-mono text-sm">
              <code>
                {installedComponents
                  .map((comp) => `npx shadcn@latest add ${comp} --overwrite`)
                  .join(" && ")}
              </code>
            </div>
            <p className="mt-2 text-muted-foreground text-sm">
              Или создайте скрипт в package.json для автоматизации
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Установленные компоненты */}
      <div className="mb-8">
        <h2 className="mb-4 font-semibold text-2xl">
          Установленные компоненты
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {installedComponents.map((component) => (
            <Card key={component}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{component}</CardTitle>
                  <CheckCircle2 className="size-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    className="h-7 text-xs"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          `npx shadcn@latest add ${component} --overwrite`
                        );
                        toast.success("Команда скопирована в буфер обмена");
                      } catch (_error) {
                        toast.error("Не удалось скопировать команду");
                      }
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Копировать команду
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Доступные для установки */}
      {missingComponents.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 font-semibold text-2xl">
            Доступные для установки
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {missingComponents.map((component) => (
              <Card key={component}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{component}</CardTitle>
                    <Circle className="size-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      className="h-7 text-xs"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            `npx shadcn@latest add ${component}`
                          );
                          toast.success("Команда скопирована в буфер обмена");
                        } catch (_error) {
                          toast.error("Не удалось скопировать команду");
                        }
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Копировать команду
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Важные замечания */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 text-amber-600 dark:text-amber-400" />
            <CardTitle>Важные замечания</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            • <strong>Резервное копирование:</strong> Перед обновлением сделайте
            коммит в git
          </p>
          <p>
            • <strong>Кастомизация:</strong> Если вы изменили компоненты,
            обновление перезапишет ваши изменения
          </p>
          <p>
            • <strong>Проверка:</strong> После обновления проверьте, что все
            работает корректно
          </p>
          <p>
            • <strong>MCP ограничения:</strong> shadcn MCP предоставляет только
            специальные компоненты (AI, charts и т.д.), базовые компоненты
            обновляются через CLI
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
