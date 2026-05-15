import type { Subtitle } from '@/types';

const uuidv4 = () => crypto.randomUUID();

/**
 * Parse VTT text content into Subtitle objects.
 *
 * IMPORTANT: This function expects the *text content* of a VTT file, not a URL.
 * The backend returns `subtitles_url` (a Supabase signed URL) — callers must
 * fetch the URL first and pass the response text here:
 *
 *   const vttText = await fetch(subtitles_url).then(r => r.text());
 *   const subtitles = parseVTT(vttText);
 *
 * If a URL-like string is accidentally passed (starts with "http"), we return []
 * rather than producing garbage output.
 */
export function parseVTT(vttString: string): Subtitle[] {
  if (!vttString || !vttString.trim()) return [];

  // Guard: if caller accidentally passes a URL instead of text content, bail cleanly
  if (vttString.trimStart().startsWith('http')) {
    console.warn('[parseVTT] Received a URL instead of VTT text content. Fetch the URL first.');
    return [];
  }

  const subtitles: Subtitle[] = [];
  const lines = vttString.split('\n');
  
  let i = 0;
  // Skip WEBVTT header and any metadata
  while (i < lines.length && !lines[i].includes('-->')) {
    i++;
  }

  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Look for timestamp line (format: 00:00:01.000 --> 00:00:03.500)
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->').map(s => s.trim());
      const start = parseTimestamp(startStr);
      const end = parseTimestamp(endStr);
      
      // Collect text lines until empty line or next timestamp
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() && !lines[i].includes('-->')) {
        textLines.push(lines[i].trim());
        i++;
      }
      
      if (textLines.length > 0 && start !== null && end !== null) {
        subtitles.push({
          id: uuidv4(),
          startTime: start,
          endTime: end,
          text: textLines.join(' '),
        });
      }
    } else {
      i++;
    }
  }

  return subtitles;
}

/**
 * Parse VTT timestamp to milliseconds
 * Formats: "00:00:01.000" or "00:01:23.456"
 */
function parseTimestamp(timestamp: string): number | null {
  const match = timestamp.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
  if (!match) return null;

  const [, hours, minutes, seconds, milliseconds] = match;
  return (
    parseInt(hours) * 3600000 +
    parseInt(minutes) * 60000 +
    parseInt(seconds) * 1000 +
    parseInt(milliseconds)
  );
}

/**
 * Extract video duration from VTT subtitles (last subtitle end time)
 */
export function getVideoDurationFromSubtitles(subtitles: Subtitle[]): number {
  if (subtitles.length === 0) return 0;
  const lastSub = subtitles[subtitles.length - 1];
  return lastSub.endTime;
}