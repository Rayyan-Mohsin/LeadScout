import { useState } from "react";
import { Search, Loader2 } from "lucide-react";

export default function SearchBar({ onSearch, loading }) {
  const [value, setValue] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed && !loading) onSearch(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex border-b border-line">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="City or zip code, e.g. Austin, TX"
        className="flex-1 bg-transparent px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="flex shrink-0 items-center gap-2 bg-ink px-4 py-3 text-sm font-medium text-paper transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 md:px-5"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">{loading ? "Scanning…" : "Search"}</span>
      </button>
    </form>
  );
}
