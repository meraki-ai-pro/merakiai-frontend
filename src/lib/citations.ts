/**
 * Turning `[2]` in an answer into something the student can click.
 *
 * The tutor writes bracketed citation markers into ordinary prose. Rather than
 * post-processing rendered DOM or writing a remark plugin, markers are rewritten
 * into Markdown links with a reserved `#cite-N` href before rendering, and the
 * renderer overrides the anchor component for that href. This keeps the whole
 * transformation inside machinery react-markdown already runs.
 *
 * The rewrite has to leave alone every other place brackets legitimately appear:
 * existing Markdown links, fenced and inline code, and LaTeX.
 */

export const CITE_HREF_PREFIX = '#cite-';

/** `[2]` or `[12]`, not followed by `(` — which would make it a Markdown link. */
const CITATION_RE = /\[(\d{1,2})\](?!\()/g;

/** Regions where a bracketed number must be left exactly as written. */
const PROTECTED_RE = new RegExp(
  [
    '```[\\s\\S]*?```', // fenced code
    '`[^`\\n]*`', //       inline code
    '\\$\\$[\\s\\S]*?\\$\\$', // display maths
    '\\$[^$\\n]*\\$', //   inline maths
    '\\[[^\\]]*\\]\\([^)]*\\)', // existing links
  ].join('|'),
  'g',
);

/**
 * Rewrite citation markers as links the renderer can intercept.
 *
 * `maxCitation` guards against a marker the model invented: a `[7]` with only
 * four sources is left as plain text rather than rendered as a dead badge.
 */
export function linkifyCitations(markdown: string, maxCitation: number): string {
  if (!markdown || maxCitation < 1) return markdown;

  // Walk the protected regions and only rewrite the gaps between them.
  let result = '';
  let cursor = 0;

  PROTECTED_RE.lastIndex = 0;
  for (let match = PROTECTED_RE.exec(markdown); match; match = PROTECTED_RE.exec(markdown)) {
    result += rewrite(markdown.slice(cursor, match.index), maxCitation);
    result += match[0];
    cursor = match.index + match[0].length;
  }
  result += rewrite(markdown.slice(cursor), maxCitation);

  return result;
}

function rewrite(segment: string, maxCitation: number): string {
  return segment.replace(CITATION_RE, (whole, digits: string) => {
    const n = Number(digits);
    if (n < 1 || n > maxCitation) return whole;
    return `[${n}](${CITE_HREF_PREFIX}${n})`;
  });
}

/** Citation number for a rewritten href, or null if it is an ordinary link. */
export function parseCitationHref(href: string | undefined): number | null {
  if (!href || !href.startsWith(CITE_HREF_PREFIX)) return null;
  const n = Number(href.slice(CITE_HREF_PREFIX.length));
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Citation numbers actually used in the text, in order of first appearance. */
export function citationsUsed(markdown: string, maxCitation: number): number[] {
  const seen: number[] = [];
  const linked = linkifyCitations(markdown, maxCitation);
  const re = new RegExp(`\\]\\(${CITE_HREF_PREFIX}(\\d+)\\)`, 'g');
  for (let m = re.exec(linked); m; m = re.exec(linked)) {
    const n = Number(m[1]);
    if (!seen.includes(n)) seen.push(n);
  }
  return seen;
}

/** True when the text contains at least one usable citation marker. */
export function hasCitations(markdown: string, maxCitation: number): boolean {
  return citationsUsed(markdown, maxCitation).length > 0;
}
