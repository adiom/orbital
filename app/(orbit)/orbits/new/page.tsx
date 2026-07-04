"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function NewOrbitPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch("/api/sfera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          visibility,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Не удалось создать");
      }

      const data = await response.json();
      router.push(`/orbit/${data.sfera.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось создать"
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/50 to-purple-50/50 p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text font-bold text-3xl text-transparent">
            Создать...
          </h1>
        </div>

        <form
          className="overflow-hidden rounded-3xl border-2 border-gray-200 bg-white p-8 shadow-xl"
          onSubmit={handleSubmit}
        >
          <div className="space-y-5">
            <div>
              <Label className="font-semibold text-sm" htmlFor="title">
                Название
              </Label>
              <Input
                className="mt-2 rounded-xl border-2"
                disabled={isCreating}
                id="title"
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Можно оставить пустым"
                value={title}
              />
            </div>

            <div>
              <Label className="font-semibold text-sm" htmlFor="description">
                О чем это
              </Label>
              <Textarea
                className="mt-2 min-h-[80px] rounded-xl border-2"
                disabled={isCreating}
                id="description"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Необязательно"
                value={description}
              />
            </div>

            <div>
              <Label className="font-semibold text-sm" htmlFor="visibility">
                Доступ
              </Label>
              <Select
                disabled={isCreating}
                onValueChange={setVisibility}
                value={visibility}
              >
                <SelectTrigger className="mt-2 rounded-xl border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Личное</SelectItem>
                  <SelectItem value="public">Открытое</SelectItem>
                  <SelectItem value="dao">DAO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              className="flex-1 rounded-xl"
              disabled={isCreating}
              onClick={() => router.back()}
              type="button"
              variant="outline"
            >
              Отмена
            </Button>
            <Button
              className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl"
              disabled={isCreating}
              type="submit"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Создается...
                </>
              ) : (
                "Создать"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
