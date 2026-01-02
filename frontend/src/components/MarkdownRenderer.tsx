import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Validates a URL to prevent XSS attacks via dangerous protocols.
 * Only allows http, https, and mailto protocols.
 */
function isValidUrl(href: string | undefined): boolean {
  if (!href) return false;

  try {
    const url = new URL(href, window.location.origin);
    const allowedProtocols = ["http:", "https:", "mailto:"];
    return allowedProtocols.includes(url.protocol);
  } catch {
    // If URL parsing fails, check if it's a relative URL (starts with / or #)
    return href.startsWith("/") || href.startsWith("#");
  }
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-semibold tracking-tight mava-heading-text mt-4 mb-2 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold tracking-tight mava-heading-text mt-3 mb-2 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium tracking-tight mava-heading-text mt-3 mb-1 first:mt-0">
              {children}
            </h3>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="text-sm mava-text mb-2 last:mb-0 leading-relaxed">
              {children}
            </p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-outside text-sm mava-text mb-2 pl-5 space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside text-sm mava-text mb-2 pl-5 space-y-1">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-sm mava-text pl-1">{children}</li>
          ),

          // Inline formatting
          strong: ({ children }) => (
            <strong className="font-semibold mava-heading-text">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic mava-text">{children}</em>
          ),

          // Links - with URL validation to prevent XSS
          a: ({ href, children }) => {
            if (!isValidUrl(href)) {
              // Render as plain text if URL is invalid/dangerous
              return <span className="mava-text">{children}</span>;
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="mava-link hover:underline"
              >
                {children}
              </a>
            );
          },

          // Code blocks
          code: ({ className, children }) => {
            const isInline = !className;

            // Code block without language
            if (!isInline) {
              return (
                <pre className="mava-code-block rounded-lg p-3 my-2 overflow-x-auto text-xs">
                  <code className="font-mono leading-relaxed">
                    {children}
                  </code>
                </pre>
              );
            }

            // Inline code
            return (
              <code className="mava-inline-code px-1.5 py-0.5 rounded text-xs font-mono">
                {children}
              </code>
            );
          },

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="mava-blockquote border-l-2 pl-3 my-2 py-1 italic text-sm rounded-r-lg">
              {children}
            </blockquote>
          ),

          // Horizontal rules
          hr: () => <hr className="mava-hr my-4" />,

          // Tables (GFM)
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border-collapse mava-table text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="mava-table-head">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="mava-table-row">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-medium mava-table-header">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 mava-table-cell">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
