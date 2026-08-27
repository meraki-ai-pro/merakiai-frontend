import type { RetrievedSource } from '@/types/api';

/** Hide internal upload filenames while retaining useful section/page context. */
export function studentSourceLabel(source: RetrievedSource): string {
  let label = source.location || '';
  if (source.source_filename) {
    label = label.replace(source.source_filename, '');
  }
  label = label
    .replace(/^\s*[,\-–—•]+\s*/, '')
    .replace(/\s*[,\-–—•]+\s*$/, '')
    .trim();

  if (label) return label;
  if (source.section_title) return source.section_title;
  if (source.page != null) return `Page ${source.page}`;
  return 'Course material';
}
