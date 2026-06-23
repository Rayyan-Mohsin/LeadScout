export default function Header() {
  return (
    <header className="flex items-center justify-between border-b border-line px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="h-7 w-7 bg-ink" />
        <h1 className="text-lg font-semibold tracking-tight text-ink">
          Leadscout
        </h1>
      </div>
      <span className="text-xs font-medium uppercase tracking-widest text-muted">
        Local lead generation
      </span>
    </header>
  );
}
