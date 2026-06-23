import { Phone, MapPin, Tag } from "lucide-react";

export default function LeadCard({ lead, active, onSelect }) {
  return (
    <button
      onClick={() => onSelect(lead)}
      className={`w-full border-b border-line px-4 py-4 text-left transition-colors ${
        active ? "bg-accent-dim" : "hover:bg-black/[0.02]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug text-ink">
          {lead.name}
        </h3>
        <span className="shrink-0 border border-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
          No site
        </span>
      </div>

      <div className="mt-2 space-y-1 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <Tag className="h-3 w-3 shrink-0" />
          <span>{lead.category || "Uncategorized"}</span>
        </div>
        {lead.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3 w-3 shrink-0" />
            <span>{lead.phone}</span>
          </div>
        )}
        <div className="flex items-start gap-1.5">
          <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
          <span>{lead.address}</span>
        </div>
      </div>
    </button>
  );
}
