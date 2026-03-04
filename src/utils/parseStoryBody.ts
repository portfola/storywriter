import { StorySection } from '@/types/story';

const IMAGE_REGEX = /!\[.*?\]\(\s*(https?:\/\/[^)]+)\s*\)/i;

/**
 * Extracts the first markdown image URL from a text block and returns
 * the cleaned text with both the image tag and any "Illustration:" line removed.
 */
function extractImage(text: string): { imageUrl: string | null; cleanText: string } {
  const match = text.match(IMAGE_REGEX);
  const cleanText = text
    .replace(IMAGE_REGEX, '')
    .replace(/Illustration[:.]?.+/gi, '')
    .trim();

  return {
    imageUrl: match ? match[1].trim() : null,
    cleanText,
  };
}

/**
 * Parses an API story body into display-ready sections.
 *
 * - Splits on `---PAGE BREAK---`
 * - Extracts markdown images per page using the same regex the generation
 *   service uses, so images survive the round-trip to the backend.
 * - Returns the first image found as `coverImageUrl` for use in list cards.
 */
export function parseStoryBody(body: string): {
  sections: StorySection[];
  coverImageUrl: string | null;
} {
  const rawPages = body.split(/---PAGE BREAK---/i);
  let coverImageUrl: string | null = null;
  const sections: StorySection[] = [];

  for (const pageText of rawPages) {
    const trimmed = pageText.trim();
    if (!trimmed) continue;

    const { imageUrl, cleanText } = extractImage(trimmed);
    if (!cleanText) continue;

    if (imageUrl && !coverImageUrl) {
      coverImageUrl = imageUrl;
    }

    sections.push({ text: cleanText, imageUrl });
  }

  return { sections, coverImageUrl };
}
