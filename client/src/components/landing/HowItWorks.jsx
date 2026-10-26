import Section from "@/components/common/Section";
import SectionLabel from "@/components/common/SectionLabel";
import SectionHeading from "@/components/common/SectionHeading";
import landingContent from "@/data/landingContent";

export default function HowItWorks() { const content = landingContent.howItWorks; return <Section id="journey"><SectionLabel>{content.label}</SectionLabel><SectionHeading>{content.heading}</SectionHeading><ol className="mt-8 flex flex-wrap gap-3 text-sm text-muted">{content.steps.map((step) => <li className="rounded-md border border-line bg-paper px-4 py-3" key={step}>{step}</li>)}</ol><p className="mt-8 text-xs uppercase tracking-[0.14em] text-muted">TODO: build visual</p></Section>; }
