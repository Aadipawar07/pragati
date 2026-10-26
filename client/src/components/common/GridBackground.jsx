export default function GridBackground({ className = "" }) {
  return <div aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-0 bg-[linear-gradient(to_right,rgba(23,23,23,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(23,23,23,0.045)_1px,transparent_1px)] bg-[size:96px_96px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_78%)] ${className}`} />;
}
