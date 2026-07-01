import { getTranslations, setRequestLocale } from "next-intl/server";
import { NoteCard } from "@/components/notes/NoteCard";
import { NotesFilters } from "@/components/notes/NotesFilters";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Link } from "@/lib/i18n/navigation";
import { getNotesPageData } from "@/lib/services/notes";
import { noteFiltersSchema } from "@/lib/validations/notes";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    search?: string;
    vehicleId?: string;
    tag?: string;
    pinnedOnly?: string;
  }>;
};

export default async function NotesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const rawFilters = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("notes");

  const filters = noteFiltersSchema.parse(rawFilters);
  const { notes, tags, vehicles } = await getNotesPageData(locale as "en" | "de", filters);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Link href="/notes/new">
            <Button>{t("newNote")}</Button>
          </Link>
        }
      />

      <NotesFilters vehicles={vehicles} tags={tags} />

      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="text-sm font-semibold text-foreground">{t("empty.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("empty.subtitle")}</p>
          <Link href="/notes/new" className="mt-4 inline-block">
            <Button>{t("newNote")}</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
