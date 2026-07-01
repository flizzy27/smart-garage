"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { renderMarkdownToSafeHtml } from "@/lib/notes/markdown";

type MarkdownEditorProps = {
  id: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  placeholder?: string;
  required?: boolean;
};

type ToolbarAction =
  | { type: "wrap"; prefix: string; suffix?: string }
  | { type: "line"; marker: (index: number) => string }
  | { type: "link" };

export function MarkdownEditor({
  id,
  name,
  defaultValue,
  rows = 6,
  placeholder,
  required = false,
}: MarkdownEditorProps) {
  const t = useTranslations("notes.editor");
  const [value, setValue] = useState(defaultValue ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function applySelection(next: string, cursorStart: number, cursorEnd: number) {
    setValue(next);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  function runAction(action: ToolbarAction) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);
    const placeholderText = t("toolbar.selectionPlaceholder");

    if (action.type === "wrap") {
      const suffix = action.suffix ?? action.prefix;
      const text = selected || placeholderText;
      const next = `${before}${action.prefix}${text}${suffix}${after}`;
      const from = start + action.prefix.length;
      applySelection(next, from, from + text.length);
      return;
    }

    if (action.type === "line") {
      const text = selected || placeholderText;
      const lines = text.split("\n").map((line, index) => `${action.marker(index)}${line}`);
      const joined = lines.join("\n");
      const next = `${before}${joined}${after}`;
      applySelection(next, start, start + joined.length);
      return;
    }

    if (action.type === "link") {
      const text = selected || t("toolbar.linkText");
      const next = `${before}[${text}](https://)${after}`;
      const urlStart = start + text.length + 3;
      applySelection(next, urlStart, urlStart + "https://".length);
    }
  }

  const toolbarButtons: { label: string; title: string; action: ToolbarAction }[] = [
    { label: "H", title: t("toolbar.heading"), action: { type: "line", marker: () => "### " } },
    { label: "B", title: t("toolbar.bold"), action: { type: "wrap", prefix: "**" } },
    { label: "I", title: t("toolbar.italic"), action: { type: "wrap", prefix: "*" } },
    { label: "•", title: t("toolbar.bulletList"), action: { type: "line", marker: () => "- " } },
    {
      label: "1.",
      title: t("toolbar.numberedList"),
      action: { type: "line", marker: (i) => `${i + 1}. ` },
    },
    { label: "🔗", title: t("toolbar.link"), action: { type: "link" } },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {toolbarButtons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              title={btn.title}
              aria-label={btn.title}
              onClick={() => runAction(btn.action)}
              className="flex h-8 min-w-[32px] items-center justify-center rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              {btn.label}
            </button>
          ))}
        </div>
        <div className="flex rounded-md border border-border bg-card p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setTab("write")}
            className={`min-h-[28px] rounded px-2.5 py-1 font-medium transition ${
              tab === "write" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            }`}
          >
            {t("toolbar.write")}
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={`min-h-[28px] rounded px-2.5 py-1 font-medium transition ${
              tab === "preview" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            }`}
          >
            {t("toolbar.preview")}
          </button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        id={id}
        name={name}
        required={required}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 ${
          tab === "preview" ? "hidden" : ""
        }`}
      />

      {tab === "preview" ? (
        <div
          className="prose-sg min-h-28 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
          dangerouslySetInnerHTML={{
            __html: renderMarkdownToSafeHtml(value) || `<p class="text-muted-foreground">${t("toolbar.emptyPreview")}</p>`,
          }}
        />
      ) : null}

      <p className="text-[11px] text-muted-foreground">{t("toolbar.hint")}</p>
    </div>
  );
}
