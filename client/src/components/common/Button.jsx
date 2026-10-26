import { cn } from "@/utils/cn";

const variants = {
  primary: "bg-ink text-white hover:bg-ink-soft",
  secondary: "border border-line bg-paper text-ink hover:border-taupe"
};

const sizes = {
  sm: "px-4 py-2 text-xs",
  md: "px-5 py-3 text-sm"
};

export default function Button({ as = "button", variant = "primary", size = "md", className, children, ...props }) {
  const Element = as;
  return <Element className={cn("inline-flex items-center justify-center rounded-md font-semibold transition-colors", variants[variant], sizes[size], className)} {...props}>{children}</Element>;
}
