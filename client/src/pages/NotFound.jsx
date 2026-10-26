import { Link } from "react-router-dom";
import Container from "@/components/common/Container";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center">
      <Container>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">404 / Not found</p>
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight md:text-6xl">This page is not part of the study system yet.</h1>
        <Link className="mt-8 inline-flex rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white" to="/">Return home</Link>
      </Container>
    </main>
  );
}
