import Section from "@/components/common/Section";
import SectionLabel from "@/components/common/SectionLabel";
import SectionHeading from "@/components/common/SectionHeading";
import landingContent from "@/data/landingContent";

export default function FutureSection() { const content = landingContent.future; return <Section id="future"><SectionLabel>{content.label}</SectionLabel><SectionHeading>{content.heading}</SectionHeading><ul className="mt-8 space-y-3 text-sm text-muted">{content.futureItems.map((item) => <li key={item}>{item}</li>)}</ul><p className="mt-8 text-xs uppercase tracking-[0.14em] text-muted">TODO: build visual</p></Section>; }
