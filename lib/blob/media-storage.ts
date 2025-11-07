/**
 * AVRORA: Blob Storage Utilities
 *
 * Helper functions for saving generated media (images, audio, video) to Vercel Blob Storage
 */

import { put } from "@vercel/blob";

/**
 * Download media from URL and upload to Vercel Blob Storage
 *
 * @param url - Source URL of the media
 * @param filename - Desired filename in blob storage
 * @param contentType - MIME type of the file
 * @returns Blob storage URL
 */
export async function saveMediaToBlob(
  url: string,
  filename: string,
  contentType: string
): Promise<string> {
  try {
    console.log(`📦 Saving media to blob storage: ${filename}`);

    // Fetch the media from the source URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch media: ${response.statusText}`);
    }

    // Get the media data
    const blob = await response.blob();

    // Upload to Vercel Blob
    const { url: blobUrl } = await put(filename, blob, {
      access: "public",
      contentType,
    });

    console.log(`✅ Media saved to blob: ${blobUrl}`);
    return blobUrl;
  } catch (error) {
    console.error("❌ Error saving media to blob:", error);
    throw error;
  }
}

/**
 * Generate a unique filename for generated media
 *
 * @param prefix - Prefix for the filename (e.g., "image", "music", "video")
 * @param extension - File extension (e.g., "png", "mp3", "mp4")
 * @returns Unique filename
 */
export function generateMediaFilename(
  prefix: string,
  extension: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `avrora/${prefix}-${timestamp}-${random}.${extension}`;
}

/**
 * Save generated image to Vercel Blob
 * Supports both URL and Uint8Array inputs
 */
export async function saveImageToBlob(
  imageData: string | Uint8Array
): Promise<string> {
  const filename = generateMediaFilename("image", "png");

  // If it's a Uint8Array, upload directly
  if (imageData instanceof Uint8Array) {
    try {
      console.log(`📦 Uploading image buffer to blob storage: ${filename}`);
      const { url: blobUrl } = await put(filename, Buffer.from(imageData), {
        access: "public",
        contentType: "image/png",
      });
      console.log(`✅ Image buffer saved to blob: ${blobUrl}`);
      return blobUrl;
    } catch (error) {
      console.error("❌ Error uploading image buffer to blob:", error);
      throw error;
    }
  }

  // Otherwise treat as URL and download first
  return saveMediaToBlob(imageData, filename, "image/png");
}

/**
 * Save generated music to Vercel Blob
 */
export async function saveMusicToBlob(audioUrl: string): Promise<string> {
  const filename = generateMediaFilename("music", "mp3");
  return saveMediaToBlob(audioUrl, filename, "audio/mpeg");
}

/**
 * Save generated video to Vercel Blob
 */
export async function saveVideoToBlob(videoUrl: string): Promise<string> {
  const filename = generateMediaFilename("video", "mp4");
  return saveMediaToBlob(videoUrl, filename, "video/mp4");
}
