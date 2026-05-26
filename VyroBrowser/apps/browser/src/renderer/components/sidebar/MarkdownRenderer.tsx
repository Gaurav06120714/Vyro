import React from 'react';

interface Props {
  content: string;
}

function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Process inline patterns: code, bold, italic, links
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith('`')) {
      parts.push(
        <code key={match.index} className="bg-white/10 px-1 rounded text-vyro-300 font-mono text-sm">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**')) {
      parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*')) {
      parts.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith('[')) {
      const labelMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (labelMatch) {
        parts.push(
          <a
            key={match.index}
            href={labelMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="text-vyro-400 underline hover:text-vyro-300"
          >
            {labelMatch[1]}
          </a>
        );
      }
    }
    last = match.index + token.length;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts;
}

export const MarkdownRenderer: React.FC<Props> = ({ content }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} className="bg-[var(--bg-surface)] rounded-lg p-4 overflow-x-auto my-2">
          <code className={`font-mono text-sm text-green-300 language-${lang}`}>
            {codeLines.join('\n')}
          </code>
        </pre>
      );
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-base font-semibold mt-3 mb-1 text-white">{parseInline(line.slice(4))}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-lg font-semibold mt-4 mb-1 text-white">{parseInline(line.slice(3))}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-xl font-bold mt-4 mb-2 text-white">{parseInline(line.slice(2))}</h1>);
    }
    // Unordered list
    else if (line.match(/^[-*] /)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        listItems.push(
          <li key={i} className="ml-4 list-disc">{parseInline(lines[i].slice(2))}</li>
        );
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="my-1 space-y-0.5">{listItems}</ul>);
      continue;
    }
    // Ordered list
    else if (line.match(/^\d+\. /)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        const text = lines[i].replace(/^\d+\. /, '');
        listItems.push(
          <li key={i} className="ml-4 list-decimal">{parseInline(text)}</li>
        );
        i++;
      }
      elements.push(<ol key={`ol-${i}`} className="my-1 space-y-0.5">{listItems}</ol>);
      continue;
    }
    // Empty line
    else if (line.trim() === '') {
      elements.push(<br key={i} />);
    }
    // Normal paragraph
    else {
      elements.push(
        <p key={i} className="leading-relaxed">
          {parseInline(line)}
        </p>
      );
    }

    i++;
  }

  return <div className="text-sm text-white/90 space-y-1">{elements}</div>;
};
