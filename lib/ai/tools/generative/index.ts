/**
 * AVRORA: Generative Tools Index
 *
 * Export all generative AI tools (image, music, video, text-to-speech)
 */

export { generateImage, parseImageGenerationRequest } from "./generate-image";
export {
  generateImageReplicate,
  parseReplicateImageRequest,
} from "./generate-image-replicate";
export { generateMusic, parseMusicGenerationRequest } from "./generate-music";
export { generateVideo, parseVideoGenerationRequest } from "./generate-video";
export { parseTextToSpeechRequest, textToSpeech } from "./text-to-speech";
