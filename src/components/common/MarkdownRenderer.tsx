'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { linkifyCitations, parseCitationHref } from '@/lib/citations';
import { useSources } from '@/components/sources/SourcesContext';
import { CitationBadge } from '@/components/sources/CitationBadge';

interface MarkdownRendererProps {
  content: string;
  /** Larger display maths and looser spacing, for the presentation board. */
  variant?: 'chat' | 'board' | 'question';
}

/**
 * Markdown with LaTeX and inline citations.
 *
 * `$…$` renders inline maths, `$$…$$` display maths, and a bracketed `[2]` is
 * rewritten to a reserved link before rendering so the anchor override below
 * can turn it into a clickable badge. Citations only activate inside a
 * `SourcesProvider`; elsewhere the brackets stay as written.
 *
 * Note on sanitising: this used to run `DOMPurify.sanitize()` over the markdown
 * *source* before rendering. That was both harmful and unnecessary — harmful
 * because DOMPurify parses its input as HTML, so an inequality like `$x < 5$`
 * looked like the start of a tag and was mangled; unnecessary because
 * react-markdown does not render raw HTML unless `rehype-raw` is added, which
 * it is not. The markdown source is not HTML, so sanitising it is the wrong
 * layer.
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  variant = 'chat',
}) => {
  const citations = useSources();
  const sources = citations?.sources ?? [];

  const prepared = useMemo(
    () => (sources.length ? linkifyCitations(content, sources.length) : content),
    [content, sources.length],
  );

  const components = useMemo(
    () => ({
      a({ href, children, ...rest }: React.ComponentPropsWithoutRef<'a'>) {
        const citation = parseCitationHref(href);
        if (citation !== null && citations) {
          return (
            <CitationBadge
              citation={citation}
              source={sources.find((s) => s.citation === citation)}
              onClick={() => citations.open(citation)}
            />
          );
        }
        return (
          <a href={href} target="_blank" rel="noreferrer noopener" {...rest}>
            {children}
          </a>
        );
      },
    }),
    [citations, sources],
  );

  return (
    <div
      className={
        variant === 'board'
          ? 'meraki-markdown meraki-board-markdown'
          : variant === 'question'
            ? 'meraki-markdown meraki-question-markdown'
            : 'meraki-markdown'
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[
          rehypeHighlight,
          // Half-written LaTeX is normal while an answer streams — render what
          // parses and leave the rest as plain text rather than throwing.
          [rehypeKatex, { throwOnError: false, strict: false }],
        ]}
        components={components}
      >
        {prepared}
      </ReactMarkdown>
    </div>
  );
};
