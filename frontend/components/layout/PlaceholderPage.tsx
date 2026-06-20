import { PageHeader } from "@/components/layout/PageHeader";

type PlaceholderPageProps = {
  title: string;
  subtitle: string;
  placeholder: string;
};

export function PlaceholderPage({
  title,
  subtitle,
  placeholder,
}: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">{placeholder}</p>
      </div>
    </div>
  );
}

export function PlaceholderShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mx-auto w-full max-w-6xl">{children}</div>;
}
