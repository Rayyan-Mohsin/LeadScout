const FEATURES = [
  "Scans 8 common business categories per search",
  "Visits each listing to confirm no website is on file",
  "Returns name, phone, address, and precise map pin",
];

export default function WelcomePanel() {
  return (
    <div className="animate-slide-in px-5 pt-7 pb-8">
      <div className="mb-5">
        <div className="mb-3 h-px w-10 bg-accent" />
        <h2 className="text-sm font-semibold text-ink">Find your next client</h2>
        <p className="mt-2.5 text-xs leading-relaxed text-muted">
          Leadscout scans Google Maps for local businesses that don't have a
          website listed — a reliable signal they need one built. Type a city or
          zip code above to get started.
        </p>
      </div>

      <ul className="space-y-2.5">
        {FEATURES.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-xs text-muted">
            <span className="mt-[5px] h-1.5 w-1.5 shrink-0 bg-accent" />
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t border-line pt-5">
        <p className="text-[11px] leading-relaxed text-muted">
          A typical search takes{" "}
          <span className="font-medium text-ink">60 – 120 seconds</span>. No
          API keys or Google account required.
        </p>
      </div>
    </div>
  );
}
