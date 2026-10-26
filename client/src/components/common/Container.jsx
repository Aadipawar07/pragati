import { cn } from "@/utils/cn";

export default function Container({ className, children }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10", className)}>{children}</div>;
}
