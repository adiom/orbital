/**
 * AVRORA: Generative Tools Index
 *
 * Export all generative AI tools (image, music, video, text-to-speech, speech-to-text)
 */

// biome-ignore lint/performance/noBarrelFile: Barrel file needed for organized exports
export { generateImage, parseImageGenerationRequest } from "./generate-image";
export {
  generateImageReplicate,
  parseReplicateImageRequest,
} from "./generate-image-replicate";
export { generateMusic, parseMusicGenerationRequest } from "./generate-music";
export { generateVideo, parseVideoGenerationRequest } from "./generate-video";
export {
  extractLanguagePreference,
  isSpeechToTextRequest,
  speechToText,
} from "./speech-to-text";
export { parseTextToSpeechRequest, textToSpeech } from "./text-to-speech";
