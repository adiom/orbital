"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export type ConstelaAttachment = {
  name: string;
  url: string;
  contentType: string;
};

export type ConstelaMessage = {
  id: string;
  content: string;
  userId: string;
  userEmail: string;
  parentMessageId: string | null;
  attachments: ConstelaAttachment[];
  isForked: boolean;
  forkedSferaId: string | null;
  createdAt: Date;
};

export type ConstelaMember = {
  userId: string;
  email: string;
  role: string;
};

export type ConstelaSfera = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ConstelaParent = {
  id: string;
  title: string;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const parseAttachments = (value: unknown): ConstelaAttachment[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const name = record.name;
      const url = record.url;
      const contentType = record.contentType;

      if (
        typeof name !== "string" ||
        typeof url !== "string" ||
        typeof contentType !== "string"
      ) {
        return null;
      }

      return {
        name,
        url,
        contentType,
      } satisfies ConstelaAttachment;
    })
    .filter(
      (attachment): attachment is ConstelaAttachment => attachment !== null
    );
};

const parseMessage = (value: unknown): ConstelaMessage | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = record.id;
  const content = record.content;
  const userId = record.userId;
  const userEmail = record.userEmail;
  const parentMessageId = record.parentMessageId;
  const isForked = record.isForked;
  const forkedSferaId = record.forkedSferaId;
  const createdAt = record.createdAt;

  if (
    !isNonEmptyString(id) ||
    typeof content !== "string" ||
    !isNonEmptyString(userId) ||
    typeof userEmail !== "string" ||
    (parentMessageId !== null && !isNonEmptyString(parentMessageId)) ||
    typeof isForked !== "boolean" ||
    !(createdAt instanceof Date || typeof createdAt === "string")
  ) {
    return null;
  }

  return {
    id,
    content,
    userId,
    userEmail,
    parentMessageId:
      typeof parentMessageId === "string" ? parentMessageId : null,
    attachments: parseAttachments(record.attachments),
    isForked,
    forkedSferaId: typeof forkedSferaId === "string" ? forkedSferaId : null,
    createdAt:
      createdAt instanceof Date && !Number.isNaN(createdAt.getTime())
        ? createdAt
        : new Date(createdAt as string),
  } satisfies ConstelaMessage;
};

const parseMember = (value: unknown): ConstelaMember | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const userId = record.userId;
  const email = record.email;
  const role = record.role;

  if (
    !isNonEmptyString(userId) ||
    typeof email !== "string" ||
    typeof role !== "string"
  ) {
    return null;
  }

  return {
    userId,
    email,
    role,
  } satisfies ConstelaMember;
};

const parseSfera = (value: unknown): ConstelaSfera | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = record.id;
  const title = record.title;
  const description = record.description;
  const visibility = record.visibility;
  const ownerId = record.ownerId;
  const createdAt = record.createdAt;
  const updatedAt = record.updatedAt;

  if (
    !isNonEmptyString(id) ||
    typeof title !== "string" ||
    !isNonEmptyString(ownerId) ||
    typeof visibility !== "string" ||
    !(createdAt instanceof Date || typeof createdAt === "string") ||
    !(updatedAt instanceof Date || typeof updatedAt === "string")
  ) {
    return null;
  }

  return {
    id,
    title,
    description: typeof description === "string" ? description : null,
    visibility,
    ownerId,
    createdAt:
      createdAt instanceof Date && !Number.isNaN(createdAt.getTime())
        ? createdAt
        : new Date(createdAt as string),
    updatedAt:
      updatedAt instanceof Date && !Number.isNaN(updatedAt.getTime())
        ? updatedAt
        : new Date(updatedAt as string),
  } satisfies ConstelaSfera;
};

const parseParent = (value: unknown): ConstelaParent | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = record.id;
  const title = record.title;

  if (!isNonEmptyString(id) || typeof title !== "string") {
    return null;
  }

  return {
    id,
    title,
  } satisfies ConstelaParent;
};

export type UseConstelaState = {
  sfera: ConstelaSfera | null;
  messages: ConstelaMessage[];
  members: ConstelaMember[];
  parent: ConstelaParent | null;
  isLoading: boolean;
};

export const useConstela = (sferaId: string) => {
  const [state, setState] = useState<UseConstelaState>({
    sfera: null,
    messages: [],
    members: [],
    parent: null,
    isLoading: true,
  });

  const fetchConstela = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(`/api/sfera/${sferaId}`, { signal });
        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          const message = (errorPayload as { error?: string }).error;
          throw new Error(message || "Failed to fetch Constela");
        }

        const payload: unknown = await response.json();
        if (!payload || typeof payload !== "object") {
          throw new Error("Invalid response format");
        }

        const data = payload as Record<string, unknown>;

        const nextSfera = parseSfera(data.sfera);
        const nextMessages = Array.isArray(data.messages)
          ? data.messages
              .map((item) => parseMessage(item))
              .filter((item): item is ConstelaMessage => item !== null)
          : [];
        const nextMembers = Array.isArray(data.members)
          ? data.members
              .map((item) => parseMember(item))
              .filter((item): item is ConstelaMember => item !== null)
          : [];
        const nextParent = parseParent(data.parentSfera);

        setState({
          sfera: nextSfera,
          messages: nextMessages.reverse(),
          members: nextMembers,
          parent: nextParent,
          isLoading: false,
        });
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        console.error("Failed to load Constela:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to fetch Constela"
        );
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [sferaId]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchConstela(controller.signal);

    return () => controller.abort();
  }, [fetchConstela]);

  const refresh = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true }));
    fetchConstela();
  }, [fetchConstela]);

  return {
    ...state,
    refresh,
  };
};
