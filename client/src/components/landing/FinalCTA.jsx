import Button from "@/components/common/Button";
import Section from "@/components/common/Section";
import SectionLabel from "@/components/common/SectionLabel";
import SectionHeading from "@/components/common/SectionHeading";
import landingContent from "@/data/landingContent";

export default function FinalCTA() { const content = landingContent.finalCta; return <Section id="begin" className="bg-paper"><SectionLabel>{content.label}</SectionLabel><SectionHeading>{content.heading}</SectionHeading><Button className="mt-8" as="a" href="#top">Start with your next step</Button><p className="mt-8 text-xs uppercase tracking-[0.14em] text-muted">TODO: build visual</p></Section>; }
