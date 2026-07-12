import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const markerIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 13px;
    height: 13px;
    background: #5b9bff;
    border: 2px solid #fff;
    box-shadow: 0 0 0 1.5px #5b9bff, 0 2px 6px rgba(0,0,0,0.35);
  "></div>`,
  iconSize: [13, 13],
  iconAnchor: [6, 6],
});

const DEFAULT_CENTER = [39.8283, -98.5795];
const DEFAULT_ZOOM = 4;

function FlyToLead({ lead }) {
  const map = useMap();
  useEffect(() => {
    if (lead) map.flyTo([lead.lat, lead.lng], 15, { duration: 0.7 });
  }, [lead, map]);
  return null;
}

export default function MapView({ leads, selectedLead, onSelectLead, mobileTab }) {
  return (
    <div
      className={`h-full w-full
        ${mobileTab === "map" ? "block" : "hidden"}
        md:block`}
    >
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer attribution={ATTRIBUTION} url={TILE_URL} />
        <FlyToLead lead={selectedLead} />

        {leads.map((lead) => (
          <Marker
            key={lead.id}
            position={[lead.lat, lead.lng]}
            icon={markerIcon}
            eventHandlers={{ click: () => onSelectLead(lead) }}
          >
            <Popup>
              <div className="px-3 py-2.5 text-sm">
                <p className="font-semibold text-ink">{lead.name}</p>
                <p className="mt-0.5 text-xs text-muted">{lead.category}</p>
                <p className="mt-1.5 text-xs text-muted">{lead.address}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
