import { Link } from "react-router-dom";
import Button from "@/components/common/Button";
import Container from "@/components/common/Container";

export default function Navbar() {
  return <header className="relative z-10 border-b border-line bg-ivory/90 backdrop-blur"><Container className="flex h-16 items-center justify-between"><Link className="text-lg font-semibold tracking-tight" to="/">PRAGATI<span className="text-muted">/AI</span></Link><nav aria-label="Primary navigation" className="hidden items-center gap-7 text-sm text-muted md:flex"><a href="#system">The system</a><a href="#journey">The journey</a><Link to="/roadmap">Roadmap</Link><Link to="/vault">Vault</Link></nav><Button as="a" href="#begin" size="sm">Get started</Button></Container></header>;
}
