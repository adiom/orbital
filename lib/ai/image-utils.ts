/**
 * Utility functions for handling images in AI requests
 */

/**
 * Converts an image URL to base64 data
 * @param url - The URL of the image to convert
 * @returns Base64 encoded image data (without data URI prefix)
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error(`Failed to convert image to base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extracts media type from content type or URL
 * @param contentType - The content type string (e.g., "image/jpeg")
 * @returns Simplified media type (e.g., "image/jpeg")
 */
export function getMediaType(contentType: string): string {
  // Remove any parameters from content type
  const baseType = contentType.split(';')[0].trim();

  // Validate it's an image type
  if (!baseType.startsWith('image/')) {
    throw new Error(`Invalid image content type: ${contentType}`);
  }

  return baseType;
}

/**
 * Checks if a file part is an image
 * @param part - The message part to check
 * @returns True if the part is an image file
 */
export function isImagePart(part: { type: string; mediaType?: string }): boolean {
  return part.type === 'file' && !!part.mediaType?.startsWith('image/');
}
