import SearchBar from "./SearchBar";
import LeadCard from "./LeadCard";

export default function Sidebar({
  leads,
  loading,
  error,
  selectedLead,
  onSearch,
  onSelectLead,
}) {
  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-r border-line bg-paper">
      <SearchBar onSearch={onSearch} loading={loading} />

      <div className="flex items-center justify-between px-4 py-3 text-xs font-medium uppercase tracking-widest text-muted">
        <span>Leads found</span>
        <span>{leads.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && (
          <p className="px-4 py-6 text-sm text-accent">{error}</p>
        )}

        {!error && !loading && leads.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted">
            Search a city or zip code to find local businesses with no
            website listed on their Maps profile.
          </p>
        )}

        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            active={selectedLead?.id === lead.id}
            onSelect={onSelectLead}
          />
        ))}
      </div>
    </aside>
  );
}
