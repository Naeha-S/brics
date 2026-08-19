import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import * as h3 from 'h3-js';

const OWM_KEY = '3f04af8f0d7e79fc646d1f325cc077ac';

export function Map({
  reports,
  activeLayer,
  onLayerChange,
  mapTitle,
  selectedDistrict,
  selectedState,
  selectedCountry,
  jurisdictions,
  onSelectCorridor,
  onOpenReportModal
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerLayerRef = useRef(null);
  const h3LayerRef = useRef(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([13.0827, 80.2707], 12);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© CARTO • © OpenStreetMap'
    }).addTo(map);

    // OWM Tile Overlays
    const owmClouds = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`, { opacity: 0.40, maxZoom: 19 });
    const owmPrecip = L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`, { opacity: 0.45, maxZoom: 19 });
    const owmWind = L.tileLayer(`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`, { opacity: 0.40, maxZoom: 19 });
    const owmTemp = L.tileLayer(`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`, { opacity: 0.38, maxZoom: 19 });
    const owmPressure = L.tileLayer(`https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`, { opacity: 0.35, maxZoom: 19 });

    L.control.layers(null, {
      "☁️ Cloud Cover": owmClouds,
      "🌧️ Precipitation": owmPrecip,
      "💨 Wind Velocity": owmWind,
      "🌡️ Surface Temp": owmTemp,
      "🔵 Pressure Isobars": owmPressure
    }, { collapsed: true, position: 'topright' }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    h3LayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Points and H3 Hexagons when reports or layer changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markerLayerRef.current || !h3LayerRef.current) return;

    markerLayerRef.current.clearLayers();
    h3LayerRef.current.clearLayers();

    // 1. Render Point Markers
    reports.forEach(r => {
      const color = r.verified ? '#0D9488' : (r.isHazard ? '#D97706' : '#059669');
      const icon = L.divIcon({
        html: `<div style="width:12px;height:12px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
        iconSize: [12, 12],
        className: ''
      });
      const m = L.marker([r.lat, r.lon], { icon })
        .bindTooltip(`<b>${r.district}</b> • ${r.type.replace('_', ' ')}<br><span style="font-family:monospace">${r.pm25} µg/m³ • Ci ${r.conf}</span>`);
      m.on('click', () => onOpenReportModal(r));
      markerLayerRef.current.addLayer(m);

      // 2. Render Uber H3 Resolution 8 Hexagon Polygon around points using h3-js
      try {
        const h3Index = h3.latLngToCell(r.lat, r.lon, 8);
        const hexBoundary = h3.cellToBoundary(h3Index);
        const hexPolygon = L.polygon(hexBoundary, {
          color: color,
          weight: 1,
          opacity: 0.6,
          fillColor: color,
          fillOpacity: r.verified ? 0.12 : 0.06
        });
        h3LayerRef.current.addLayer(hexPolygon);
      } catch (err) {
        // Fallback buffer
      }
    });

    // Viewport Centering: District Zoom
    if (selectedDistrict !== 'ALL') {
      const target = jurisdictions.find(j => j.district === selectedDistrict);
      if (target) map.setView([target.lat, target.lon], 12);
    } else if (selectedState !== 'ALL') {
      const stateMatches = jurisdictions.filter(j => j.state === selectedState);
      if (stateMatches.length > 0) map.setView([stateMatches[0].lat, stateMatches[0].lon], 11);
    } else if (selectedCountry !== 'ALL') {
      const countryMatches = jurisdictions.filter(j => j.nation === selectedCountry);
      if (countryMatches.length > 0) map.setView([countryMatches[0].lat, countryMatches[0].lon], 10);
    }
  }, [reports, activeLayer, selectedDistrict, selectedState, selectedCountry, jurisdictions, onOpenReportModal]);

  return (
    <section className="card relative">
      <div className="p-2.5 px-3.5 border-b border-[#E2E8F0] flex items-center justify-between gap-2.5 bg-white">
        <h2 className="text-xs font-bold tracking-wider uppercase text-[#0F172A]">{mapTitle}</h2>
        <div className="flex gap-1" role="tablist">
          {['all', 'citizen', 'satellite', 'trajectory'].map(layer => (
            <button
              key={layer}
              role="tab"
              aria-selected={activeLayer === layer}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                activeLayer === layer ? 'bg-[#1E293B] text-white border-[#1E293B]' : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-[#F1F5F9]'
              }`}
              onClick={() => onLayerChange(layer)}
            >
              {layer === 'all' ? 'All Points' : layer === 'citizen' ? 'Ground / Citizen' : layer === 'satellite' ? 'Sentinel-5P NO₂' : 'Wind Trajectory'}
            </button>
          ))}
        </div>
      </div>

      <div ref={mapContainerRef} className="h-[490px] w-full bg-[#EEF2F7]" />

      {/* Legend inside map */}
      <div className="absolute bottom-[75px] left-3 bg-white/95 border border-[#E2E8F0] shadow-md p-2 rounded-lg text-[11px] z-[500] max-w-[320px] font-mono leading-relaxed pointer-events-none">
        <div className="font-bold text-[#0F172A]">Observation Layers & H3 Res 8</div>
        <div className="flex items-center gap-3 mt-1">
          <span><i className="inline-block w-2 h-2 rounded-full bg-[#0D9488] align-middle mr-1" /> Verified (Ci≥0.70)</span>
          <span><i className="inline-block w-2 h-2 rounded-full bg-[#D97706] align-middle mr-1" /> Queued Triage</span>
          <span><i className="inline-block w-2 h-2 rounded-full bg-[#059669] align-middle mr-1" /> Sentinel-5P</span>
        </div>
        <div className="text-[10px] text-[#64748B] mt-0.5">
          Uber H3 (~0.74 km²) polygons with OWM weather overlays.
        </div>
      </div>

      {/* Quick Corridor Selection Chips */}
      <div className="p-2.5 px-3.5 border-t border-[#E2E8F0] bg-white flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
          Direct District & Corridor Zoom Targets:
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {[
            { label: '🇮🇳 Chennai (TN)', nation: 'IN', state: 'Tamil Nadu', district: 'Chennai' },
            { label: '🇮🇳 Coimbatore (TN)', nation: 'IN', state: 'Tamil Nadu', district: 'Coimbatore' },
            { label: '🇮🇳 Madurai (TN)', nation: 'IN', state: 'Tamil Nadu', district: 'Madurai' },
            { label: '🇮🇳 Salem (TN)', nation: 'IN', state: 'Tamil Nadu', district: 'Salem' },
            { label: '🇮🇳 Delhi Central', nation: 'IN', state: 'Delhi', district: 'Central Delhi' },
            { label: '🇮🇳 Mumbai City', nation: 'IN', state: 'Maharashtra', district: 'Mumbai City' },
            { label: '🇮🇳 Bengaluru', nation: 'IN', state: 'Karnataka', district: 'Bengaluru Urban' },
            { label: '🇨🇳 Beijing Chaoyang', nation: 'CN', state: 'Beijing', district: 'Chaoyang' },
            { label: '🇧🇷 São Paulo', nation: 'BR', state: 'São Paulo', district: 'São Paulo Capital' },
            { label: '🇪🇬 Cairo', nation: 'EG', state: 'Cairo', district: 'Downtown Cairo' },
            { label: '🇪🇹 Addis Bole', nation: 'ET', state: 'Addis Ababa', district: 'Bole' },
            { label: '🇮🇷 Tehran', nation: 'IR', state: 'Tehran', district: 'Tehran Central' },
            { label: '🇸🇦 Riyadh', nation: 'SA', state: 'Riyadh', district: 'Al Olaya' },
            { label: '🇦🇪 Dubai', nation: 'AE', state: 'Dubai', district: 'Downtown Dubai' },
            { label: '🇮🇩 Jakarta', nation: 'ID', state: 'Jakarta', district: 'Central Jakarta' }
          ].map(c => (
            <button
              key={c.district}
              className={`chip ${selectedDistrict === c.district ? 'active' : ''}`}
              onClick={() => onSelectCorridor(c.nation, c.state, c.district)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
