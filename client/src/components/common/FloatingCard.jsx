import { cn } from "@/utils/cn";

export default function FloatingCard({ rotate = 0, delay = "0s", className, children }) {
  return <div className={cn("rounded-lg border border-line bg-paper p-5 shadow-[0_12px_30px_rgba(23,23,23,0.06)] motion-safe:animate-[float_5s_ease-in-out_infinite]", className)} style={{ "--float-rotate": `${rotate}deg`, animationDelay: delay }}>{children}</div>;
}
