import SearchBar from "./SearchBar";
import LeadCard from "./LeadCard";
import WelcomePanel from "./WelcomePanel";

export default function Sidebar({
  leads,
  loading,
  error,
  selectedLead,
  onSearch,
  onSelectLead,
  mobileTab,
}) {
  const isInitial = !loading && !error && leads.length === 0;

  return (
    <aside
      className={`flex flex-col border-r border-line bg-paper
        ${mobileTab === "list" ? "flex" : "hidden"}
        w-full md:flex md:w-[360px] md:shrink-0 h-full`}
    >
      <SearchBar onSearch={onSearch} loading={loading} />

      {!isInitial && (
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-xs font-medium uppercase tracking-widest text-muted">
          <span>Leads found</span>
          <span>{leads.length}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {error && (
          <p className="animate-slide-in px-5 py-6 text-sm text-accent">
            {error}
          </p>
        )}

        {loading && (
          <div className="animate-slide-in px-5 py-6">
            <p className="text-sm font-medium text-ink">Scanning…</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Visiting each business listing to check for a website. This takes
              60 – 120 seconds.
            </p>
            <div className="mt-4 space-y-2">
              {[80, 60, 72, 50].map((w, i) => (
                <div
                  key={i}
                  className="h-3 animate-pulse bg-line"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          </div>
        )}

        {isInitial && !loading && <WelcomePanel />}

        {leads.map((lead, i) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            index={i}
            active={selectedLead?.id === lead.id}
            onSelect={onSelectLead}
          />
        ))}
      </div>
    </aside>
  );
}
