/**
 * Utility functions for handling multiple site photos attached to a document revision.
 * Backwards compatible with single URL strings or JSON arrays.
 */

export function parseSitePhotos(raw?: string | null): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // Try parsing as JSON array
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === 'string' ? item : item?.url))
          .filter((url): url is string => Boolean(url && typeof url === 'string'));
      }
      if (parsed && typeof parsed.url === 'string') {
        return [parsed.url];
      }
    } catch {
      // fallback
    }
  }

  // Comma-separated strings
  if (trimmed.includes(',')) {
    return trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Single plain URL
  return [trimmed];
}

export function serializeSitePhotos(photos: string[]): string | null {
  const clean = photos.map((p) => p.trim()).filter(Boolean);
  if (clean.length === 0) return null;
  return JSON.stringify(clean);
}
