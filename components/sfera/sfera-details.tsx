"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Users,
  Info,
  Lock,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type SferaDetailsProps = {
  sfera: {
    title: string;
    description: string | null;
    visibility: string;
    ownerId: string;
  };
  members: any[];
};

export function SferaDetails({ sfera, members }: SferaDetailsProps) {
  return (
    <div className="flex h-full flex-col gap-6 p-6 overflow-y-auto">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">{sfera.title}</h2>
        <div className="flex items-center gap-2">
          {sfera.visibility === "public" ? (
            <Badge variant="outline" className="gap-1 text-xs">
              <Globe className="h-3 w-3" /> Public
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-xs">
              <Lock className="h-3 w-3" /> Private
            </Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="px-4 pt-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4" /> О сфере
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {sfera.description || "Описание этой сферы пока отсутствует."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-4 pt-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" /> Участники
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex flex-col gap-3">
          {members.length > 0 ? (
            members.map((member, idx) => (
              <div key={idx} className="flex items-center gap-3 group cursor-pointer">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground border">
                  {member.email?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {member.email}
                  </p>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground italic">Нет участников</p>
          )}
        </CardContent>
      </Card>

      <div className="mt-auto pt-6">
        <Button variant="outline" className="w-full justify-start gap-2 text-sm">
          <MoreHorizontal className="h-4 w-4" /> Настройки сферы
        </Button>
      </div>
    </div>
  );
}
