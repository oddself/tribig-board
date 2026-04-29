import Link from "next/link";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "bg-teal-700 text-white shadow-sm hover:bg-teal-800 focus-visible:outline-teal-700",
  secondary: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus-visible:outline-slate-500",
  ghost: "text-slate-700 hover:bg-slate-100 focus-visible:outline-slate-500",
  danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:outline-rose-600"
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm"
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export function buttonClassName(variant: Variant = "primary", size: Size = "md", className = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`.trim();
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={buttonClassName(variant, size, className)} {...props} />;
}

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
};

export function LinkButton({ href, children, variant = "primary", size = "md", className, ...props }: LinkButtonProps) {
  return (
    <Link href={href} className={buttonClassName(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
