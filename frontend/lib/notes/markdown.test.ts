import { describe, expect, it } from "vitest";
import { markdownToPlainText, renderMarkdownToSafeHtml } from "./markdown";

describe("renderMarkdownToSafeHtml", () => {
  it("escapes raw HTML instead of rendering it", () => {
    const html = renderMarkdownToSafeHtml('<script>alert("xss")</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders headings, bold, italic, and lists", () => {
    const html = renderMarkdownToSafeHtml(
      "### Heading\n\n**bold** and *italic*\n\n- one\n- two\n\n1. first\n2. second",
    );
    expect(html).toContain("<h6>Heading</h6>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<ul><li>one</li><li>two</li></ul>");
    expect(html).toContain("<ol><li>first</li><li>second</li></ol>");
  });

  it("only allows http/https links and adds safe rel attributes", () => {
    const safe = renderMarkdownToSafeHtml("[Docs](https://example.com)");
    expect(safe).toContain('href="https://example.com"');
    expect(safe).toContain('rel="noopener noreferrer nofollow"');

    const unsafe = renderMarkdownToSafeHtml("[Click](javascript:alert(1))");
    expect(unsafe).not.toContain("<a ");
  });

  it("renders fenced code blocks as escaped text", () => {
    const html = renderMarkdownToSafeHtml("```\n<b>not bold</b>\n```");
    expect(html).toContain("<pre><code>&lt;b&gt;not bold&lt;/b&gt;</code></pre>");
  });

  it("returns an empty string for blank input", () => {
    expect(renderMarkdownToSafeHtml("")).toBe("");
    expect(renderMarkdownToSafeHtml("   ")).toBe("");
  });
});

describe("markdownToPlainText", () => {
  it("strips markdown syntax and truncates long text", () => {
    const text = markdownToPlainText("### Heading\n\n**bold** [link](https://x.com)", 200);
    expect(text).toBe("Heading bold link");
  });

  it("truncates with an ellipsis when exceeding maxLength", () => {
    const text = markdownToPlainText("a".repeat(200), 10);
    expect(text.endsWith("…")).toBe(true);
    expect(text.length).toBeLessThanOrEqual(11);
  });
});
