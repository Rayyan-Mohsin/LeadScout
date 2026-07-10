import { Sun, Moon, Map } from "lucide-react";

export default function Header({ theme, onToggleTheme, mobileTab, onSetMobileTab }) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-line bg-paper px-4 py-3 md:px-6 md:py-4">
      <div className="flex items-center gap-3">
        <div className="h-6 w-6 shrink-0 bg-ink md:h-7 md:w-7" />
        <div>
          <h1 className="text-base font-semibold leading-none tracking-tight text-ink md:text-lg">
            Leadscout
          </h1>
          <p className="mt-0.5 hidden text-[11px] text-muted md:block">
            Find local businesses with no website
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Mobile tab switcher */}
        <div className="flex border border-line md:hidden">
          <button
            onClick={() => onSetMobileTab("list")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              mobileTab === "list"
                ? "bg-ink text-paper"
                : "bg-paper text-muted hover:text-ink"
            }`}
          >
            List
          </button>
          <button
            onClick={() => onSetMobileTab("map")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              mobileTab === "map"
                ? "bg-ink text-paper"
                : "bg-paper text-muted hover:text-ink"
            }`}
          >
            <Map className="h-3 w-3" />
            Map
          </button>
        </div>

        <span className="hidden text-xs font-medium uppercase tracking-widest text-muted md:block">
          Local lead generation
        </span>

        <button
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          className="flex h-8 w-8 items-center justify-center border border-line text-muted transition-colors hover:border-ink hover:text-ink"
        >
          {theme === "dark" ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </header>
  );
}
