import { useState } from "react";
import "leaflet/dist/leaflet.css";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import MapView from "./components/MapView";
import { searchLeads } from "./api/client";

function App() {
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSearch(location) {
    setLoading(true);
    setError(null);
    setSelectedLead(null);

    try {
      const results = await searchLeads(location);
      setLeads(results);
      if (results.length === 0) {
        setError("No businesses without a website were found in that area.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong while scanning that area. Try again.",
      );
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          leads={leads}
          loading={loading}
          error={error}
          selectedLead={selectedLead}
          onSearch={handleSearch}
          onSelectLead={setSelectedLead}
        />
        <main className="flex-1">
          <MapView
            leads={leads}
            selectedLead={selectedLead}
            onSelectLead={setSelectedLead}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
