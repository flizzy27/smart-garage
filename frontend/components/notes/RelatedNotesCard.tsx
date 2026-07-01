import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Link } from "@/lib/i18n/navigation";
import { markdownToPlainText } from "@/lib/notes/markdown";
import { formatDate } from "@/lib/regional/format";
import type { SerializedNote } from "@/lib/repositories/notes";

type RelatedNotesCardProps = {
  notes: SerializedNote[];
  locale: string;
  newNoteHref: string;
};

export async function RelatedNotesCard({ notes, locale, newNoteHref }: RelatedNotesCardProps) {
  const t = await getTranslations("notes.related");

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href={newNoteHref}
          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
        >
          + {t("newNote")}
        </Link>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {notes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          notes.map((note) => (
            <Link
              key={note.id}
              href={`/notes/${note.id}`}
              className="block rounded-lg border border-border-subtle bg-card p-3 transition hover:border-accent/40 hover:bg-accent/5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                  {note.isPinned ? "★ " : ""}
                  {note.title}
                </p>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatDate(new Date(note.updatedAt), locale, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                  })}
                </span>
              </div>
              {note.content ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {markdownToPlainText(note.content, 140)}
                </p>
              ) : null}
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
