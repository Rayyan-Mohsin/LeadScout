import { useState, useEffect } from "react";
import "leaflet/dist/leaflet.css";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import MapView from "./components/MapView";
import { searchLeads } from "./api/client";

function getInitialTheme() {
  const stored = localStorage.getItem("leadscout-theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function App() {
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(getInitialTheme);
  const [mobileTab, setMobileTab] = useState("list");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("leadscout-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  async function handleSearch(location) {
    setLoading(true);
    setError(null);
    setSelectedLead(null);

    try {
      const results = await searchLeads(location);
      setLeads(results);
      if (results.length === 0) {
        setError("No businesses without a website were found in that area. Try a larger city.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong scanning that area. Try again.",
      );
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectLead(lead) {
    setSelectedLead(lead);
    setMobileTab("map");
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        mobileTab={mobileTab}
        onSetMobileTab={setMobileTab}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          leads={leads}
          loading={loading}
          error={error}
          selectedLead={selectedLead}
          onSearch={handleSearch}
          onSelectLead={handleSelectLead}
          mobileTab={mobileTab}
        />
        <main className="flex-1 overflow-hidden">
          <MapView
            leads={leads}
            selectedLead={selectedLead}
            onSelectLead={handleSelectLead}
            isDark={theme === "dark"}
            mobileTab={mobileTab}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
