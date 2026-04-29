import type { ReactNode } from "react";

const variants = {
  neutral: "bg-slate-100 text-slate-700",
  teal: "bg-teal-50 text-teal-800",
  amber: "bg-amber-50 text-amber-800",
  rose: "bg-rose-50 text-rose-800",
  indigo: "bg-indigo-50 text-indigo-800"
};

export function Badge({
  children,
  variant = "neutral"
}: {
  children: ReactNode;
  variant?: keyof typeof variants;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
}
