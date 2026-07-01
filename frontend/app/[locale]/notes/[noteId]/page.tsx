import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NoteEditorForm } from "@/components/notes/NoteEditorForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { Link } from "@/lib/i18n/navigation";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { listTagsForOwner } from "@/lib/repositories/notes";
import { getNoteEditorData } from "@/lib/services/notes";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; noteId: string }>;
};

export default async function EditNotePage({ params }: Props) {
  const { locale, noteId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("notes");

  const ownerUserId = await getCurrentUserId();
  const [data, tags] = await Promise.all([
    getNoteEditorData(locale as "en" | "de", noteId),
    listTagsForOwner(ownerUserId),
  ]);

  if (!data) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <Link
          href="/notes"
          className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          ← {t("back")}
        </Link>
      </div>
      <PageHeader title={data.note?.title ?? t("newNote")} subtitle={t("editor.editSubtitle")} />
      <NoteEditorForm
        mode="edit"
        note={data.note}
        vehicles={data.vehicles}
        templates={data.templates}
        existingTags={tags}
      />
    </div>
  );
}
