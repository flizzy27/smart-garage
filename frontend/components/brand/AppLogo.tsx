import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";

type AppLogoProps = {
  showName?: boolean;
  name?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
  onClick?: () => void;
};

const sizes = {
  sm: { box: 32, image: 28 },
  md: { box: 40, image: 36 },
  lg: { box: 56, image: 52 },
} as const;

export function AppLogo({
  showName = true,
  name = "Smart Garage",
  size = "md",
  href,
  onClick,
}: AppLogoProps) {
  const dim = sizes[size];

  const content = (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-card shadow-sm ring-1 ring-border/60"
        style={{ width: dim.box, height: dim.box }}
      >
        <Image
          src="/brand/smart-garage-logo.png"
          alt={name}
          width={dim.image}
          height={dim.image}
          className="h-auto w-auto max-h-[85%] max-w-[85%] object-contain"
          priority
        />
      </div>
      {showName ? (
        <span className="truncate text-sm font-semibold text-foreground">{name}</span>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="flex min-w-0" onClick={onClick}>
        {content}
      </Link>
    );
  }

  return content;
}
