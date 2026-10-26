import Button from "@/components/common/Button";
import GridBackground from "@/components/common/GridBackground";
import SectionLabel from "@/components/common/SectionLabel";
import SectionHeading from "@/components/common/SectionHeading";
import Container from "@/components/common/Container";
import landingContent from "@/data/landingContent";

export default function Hero() {
  const content = landingContent.hero;
  return <section className="relative overflow-hidden border-b border-line py-24 md:py-36"><GridBackground /><Container className="relative z-10"><SectionLabel>{content.label}</SectionLabel><SectionHeading>{content.heading}</SectionHeading><p className="mt-6 max-w-2xl text-lg leading-8 text-muted">{content.supportingText}</p><div className="mt-9 flex flex-wrap gap-3"><Button as="a" href="#begin">See what's next</Button><Button as="a" href="#system" variant="secondary">Explore the system</Button></div><p className="mt-16 text-xs uppercase tracking-[0.14em] text-muted">TODO: build visual</p></Container></section>;
}
