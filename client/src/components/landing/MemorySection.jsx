import Section from "@/components/common/Section";
import SectionLabel from "@/components/common/SectionLabel";
import SectionHeading from "@/components/common/SectionHeading";
import landingContent from "@/data/landingContent";

export default function MemorySection() { const content = landingContent.memory; return <Section id="memory"><SectionLabel>{content.label}</SectionLabel><SectionHeading>{content.heading}</SectionHeading><p className="mt-8 text-xs uppercase tracking-[0.14em] text-muted">TODO: build visual</p></Section>; }
