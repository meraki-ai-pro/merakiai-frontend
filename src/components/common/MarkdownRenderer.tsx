import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import DOMPurify from 'dompurify';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const sanitized = DOMPurify.sanitize(content, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  });

  return (
    <div className="meraki-markdown">
      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{sanitized}</ReactMarkdown>
    </div>
  );
};

