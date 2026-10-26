import { cn } from "@/utils/cn";
import Container from "@/components/common/Container";

export default function Section({ id, padding = "py-20 md:py-28", children, className }) {
  return <section id={id} className={cn("border-t border-line", padding, className)}><Container>{children}</Container></section>;
}
