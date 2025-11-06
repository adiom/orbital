"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";

interface Sfera {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function SferasPage() {
  const router = useRouter();
  const [sferas, setSferas] = useState<Sfera[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSferas();
  }, []);

  const fetchSferas = async () => {
    try {
      const response = await fetch("/api/sfera");
      if (!response.ok) {
        throw new Error("Failed to fetch sferas");
      }
      const data = await response.json();
      setSferas(data.sferas || []);
    } catch (error) {
      console.error("Error fetching sferas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sfera Discussions</h1>
          <p className="mt-2 text-muted-foreground">
            Collaborative discussion spaces where every message can branch into a new conversation
          </p>
        </div>
        <Button
          onClick={() => router.push("/sferas/new")}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Sfera
        </Button>
      </div>

      {sferas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-4 text-muted-foreground">
              You're not part of any Sfera yet
            </p>
            <Button onClick={() => router.push("/sferas/new")}>
              Create Your First Sfera
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sferas.map((sfera) => (
            <Card
              key={sfera.id}
              className="cursor-pointer transition-colors hover:border-primary"
              onClick={() => router.push(`/sfera/${sfera.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{sfera.title}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {sfera.role}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sfera.description && (
                  <p className="mb-2 text-sm text-muted-foreground">
                    {sfera.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{sfera.visibility}</span>
                  <span>
                    Updated {new Date(sfera.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
