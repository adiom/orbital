import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: "File size should be less than 10MB",
    })
    .refine(
      (file) => {
        const allowedTypes = [
          // Images
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/svg+xml",
          // Documents
          "application/pdf",
          "text/plain",
          "text/markdown",
          "text/csv",
          // Videos
          "video/mp4",
          "video/webm",
          "video/quicktime",
          // Audio
          "audio/mpeg",
          "audio/mp4",
          "audio/mp3",
          "audio/wav",
          "audio/x-aiff",
          "audio/x-wav",
          "audio/webm",
          "audio/ogg",
          "audio/x-m4a",
        ];
        return allowedTypes.includes(file.type);
      },
      {
        message:
          "File type not supported. Supported types: images (JPEG, PNG, GIF, WebP, SVG), documents (PDF, TXT, MD, CSV), videos (MP4, WebM, MOV), audio (MP3, M4A, WAV, WebM, OGG)",
      }
    ),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get("file") as File).name;
    const fileBuffer = await file.arrayBuffer();

    try {
      const data = await put(`${filename}`, fileBuffer, {
        access: "public",
      });

      return NextResponse.json(data);
    } catch (_error) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
