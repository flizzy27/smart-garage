/**
 * Minimal, dependency-free Markdown-subset renderer.
 *
 * We intentionally do NOT use a general-purpose Markdown/HTML library here.
 * All user input is HTML-escaped first, and only a small, explicit set of
 * safe constructs (headings, bold, italic, lists, links, inline/code blocks,
 * line breaks) are converted into HTML. Raw HTML typed by the user is never
 * rendered as HTML — it always shows up as literal text.
 *
 * Supported syntax:
 *   # / ## / ###        headings
 *   **bold** / *italic*
 *   `code`              inline code
 *   ```                 fenced code blocks
 *   - item / * item     bullet lists
 *   1. item             numbered lists
 *   [text](https://...) links (http/https only)
 *   blank line          paragraph break
 */

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(text: string): string {
  let html = escapeHtml(text);

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Links: [text](http(s)://...) — restrict to http/https to avoid javascript: URIs
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer nofollow">$1</a>',
  );

  // Bold: **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic: *text* (after bold to avoid clobbering **)
  html = html.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");

  return html;
}

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "code"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "paragraph"; text: string };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().length === 0) {
      i += 1;
      continue;
    }

    // Fenced code block
    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing fence
      blocks.push({ type: "code", text: codeLines.join("\n") });
      continue;
    }

    // Heading
    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2].trim(),
      });
      i += 1;
      continue;
    }

    // Bullet list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Paragraph: collect consecutive non-blank, non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim().length > 0 &&
      !lines[i].trim().startsWith("```") &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: "paragraph", text: paraLines.join("\n") });
  }

  return blocks;
}

/** Render user-authored Markdown-subset text into safe, sanitized HTML. */
export function renderMarkdownToSafeHtml(source: string): string {
  if (!source || !source.trim()) return "";

  const blocks = parseBlocks(source);

  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading": {
          const tag = `h${block.level + 3}`; // h4/h5/h6 — stay visually subordinate to page headings
          return `<${tag}>${renderInline(block.text)}</${tag}>`;
        }
        case "code":
          return `<pre><code>${escapeHtml(block.text)}</code></pre>`;
        case "ul":
          return `<ul>${block.items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`;
        case "ol":
          return `<ol>${block.items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ol>`;
        case "paragraph":
          return `<p>${renderInline(block.text).replace(/\n/g, "<br />")}</p>`;
        default:
          return "";
      }
    })
    .join("\n");
}

/** Plain-text preview (for list snippets/search results) — strips markdown syntax. */
export function markdownToPlainText(source: string, maxLength = 160): string {
  const text = source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/[*`_]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}
