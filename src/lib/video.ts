/** Convert supported YouTube URLs into privacy-enhanced in-app embeds. */
export function youtubeEmbedUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
    let id = '';

    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] ?? '';
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      id = url.searchParams.get('v') ?? '';
      if (!id && /^\/(embed|shorts)\//.test(url.pathname)) {
        id = url.pathname.split('/').filter(Boolean)[1] ?? '';
      }
    }
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;

    const start = Math.max(0, Number.parseInt(url.searchParams.get('t') ?? '0', 10) || 0);
    const embed = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
    if (start) embed.searchParams.set('start', String(start));
    embed.searchParams.set('rel', '0');
    return embed.toString();
  } catch {
    return null;
  }
}

/** Never expose a stored URL as the visible lecture heading. */
export function lectureHeading(title: string | null | undefined, position = 0): string {
  const candidate = title?.trim() ?? '';
  if (candidate && !/^https?:\/\//i.test(candidate)) return candidate;
  return `Lecture video${position > 0 ? ` ${position + 1}` : ''}`;
}
