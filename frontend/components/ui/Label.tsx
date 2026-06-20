import type { LabelHTMLAttributes, ReactNode } from "react";

type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode;
  required?: boolean;
};

export function Label({
  children,
  required = false,
  className = "",
  ...props
}: LabelProps) {
  return (
    <label
      className={`text-sm font-medium text-foreground ${className}`}
      {...props}
    >
      {children}
      {required ? <span className="ml-0.5 text-danger">*</span> : null}
    </label>
  );
}
