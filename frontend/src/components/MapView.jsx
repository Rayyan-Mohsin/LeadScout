import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";

const markerIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 14px;
    height: 14px;
    background: #2563ff;
    border: 2px solid #fff;
    box-shadow: 0 0 0 1px #0a0a0a;
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const DEFAULT_CENTER = [39.8283, -98.5795];
const DEFAULT_ZOOM = 4;

function FlyToLead({ lead }) {
  const map = useMap();

  useEffect(() => {
    if (lead) {
      map.flyTo([lead.lat, lead.lng], 15, { duration: 0.8 });
    }
  }, [lead, map]);

  return null;
}

export default function MapView({ leads, selectedLead, onSelectLead }) {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      zoomControl={false}
      className="h-full w-full grayscale-[15%] contrast-[1.05]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FlyToLead lead={selectedLead} />

      {leads.map((lead) => (
        <Marker
          key={lead.id}
          position={[lead.lat, lead.lng]}
          icon={markerIcon}
          eventHandlers={{ click: () => onSelectLead(lead) }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{lead.name}</p>
              <p className="text-xs text-muted">{lead.category}</p>
              <p className="mt-1 text-xs">{lead.address}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
