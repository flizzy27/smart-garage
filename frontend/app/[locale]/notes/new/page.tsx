import { getTranslations, setRequestLocale } from "next-intl/server";
import { NoteEditorForm } from "@/components/notes/NoteEditorForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { Link } from "@/lib/i18n/navigation";
import { getNoteEditorData } from "@/lib/services/notes";
import { listTagsForOwner } from "@/lib/repositories/notes";
import { getCurrentUserId } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ vehicleId?: string; maintenanceTemplateId?: string }>;
};

export default async function NewNotePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { vehicleId, maintenanceTemplateId } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("notes");

  const ownerUserId = await getCurrentUserId();
  const [data, tags] = await Promise.all([
    getNoteEditorData(locale as "en" | "de"),
    listTagsForOwner(ownerUserId),
  ]);

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
      <PageHeader title={t("newNote")} subtitle={t("editor.newSubtitle")} />
      <NoteEditorForm
        mode="create"
        vehicles={data?.vehicles ?? []}
        templates={data?.templates ?? []}
        existingTags={tags}
        defaultVehicleId={vehicleId}
        defaultTemplateId={maintenanceTemplateId}
      />
    </div>
  );
}
