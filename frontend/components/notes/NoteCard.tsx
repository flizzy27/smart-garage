"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { toggleNotePinnedAction } from "@/lib/actions/notes";
import { markdownToPlainText } from "@/lib/notes/markdown";
import { formatDate } from "@/lib/regional/format";
import type { SerializedNote } from "@/lib/repositories/notes";

type NoteCardProps = {
  note: SerializedNote;
  locale: string;
};

export function NoteCard({ note, locale }: NoteCardProps) {
  const t = useTranslations("notes");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-card p-4 transition hover:border-accent/40 hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/notes/${note.id}`} className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-accent">
            {note.title}
          </h3>
        </Link>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(() => {
              void toggleNotePinnedAction(note.id, note.vehicleId);
            })
          }
          aria-label={note.isPinned ? t("unpin") : t("pin")}
          className={`shrink-0 rounded-lg p-1.5 text-lg leading-none transition ${
            note.isPinned ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"
          }`}
        >
          {note.isPinned ? "★" : "☆"}
        </button>
      </div>

      <Link href={`/notes/${note.id}`} className="mt-1 min-h-[2.5rem] flex-1">
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {note.content ? markdownToPlainText(note.content, 160) : t("noContent")}
        </p>
      </Link>

      {(note.vehicleName || note.maintenanceTemplateName || note.tags.length > 0) ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.vehicleName ? (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
              {note.vehicleName}
            </span>
          ) : null}
          {note.maintenanceTemplateName ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
              {note.maintenanceTemplateName}
            </span>
          ) : null}
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border-subtle px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-[11px] text-muted-foreground">
        {t("updatedAt", {
          date: formatDate(new Date(note.updatedAt), locale, {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        })}
      </p>
    </div>
  );
}
