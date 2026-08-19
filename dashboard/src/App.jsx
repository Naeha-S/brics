import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Map } from './components/Map';
import { ForecastChart } from './components/ForecastChart';
import { GroundValidation } from './components/GroundValidation';
import { TieredDispatch } from './components/TieredDispatch';
import { DisputeLedger } from './components/DisputeLedger';
import { ReportModal, DisputeModal, BedcAuditModal } from './components/Modals';

import { JURISDICTIONS, generateInitialReports } from './data/jurisdictions';
import { FORECASTS } from './data/forecasts';

const OWM_KEY = '3f04af8f0d7e79fc646d1f325cc077ac';

export function App() {
  const [activeView, setActiveView] = useState('ops'); // 'ops' | 'disputes'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState('EN');

  // Cascading Geography & Temporal Filters
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [selectedState, setSelectedState] = useState('Tamil Nadu');
  const [selectedDistrict, setSelectedDistrict] = useState('Chennai');
  const [selectedTime, setSelectedTime] = useState('live');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [activeLayer, setActiveLayer] = useState('all');

  // Core Data State
  const [reports, setReports] = useState(() => generateInitialReports());
  const [disputes, setDisputes] = useState([
    {
      id: 'DISP-101',
      title: 'Level 2: Chennai vs Kanchipuram Industrial Attribution',
      filingDistrict: 'Kanchipuram Collectorate',
      respondentDistrict: 'Chennai Collectorate',
      status: 'MEDIATING',
      level: 2,
      levelLabel: 'Level 2 (State Board)',
      levelBadgeClass: 'tag-warn',
      slaCountdown: '18h 42m',
      clockLabel: 'Tier 2 (24h SLA)',
      sha256: '6172e36a88d91cec64ab8b3b7e8d7e013514514a716c8fc747e153ea95494034',
      attribution: '68% Chennai Industrial / 32% Kanchipuram Background',
      notes: 'Disputing stack plume boundary layer transport across district border under NE monsoon sea-breeze.'
    },
    {
      id: 'DISP-102',
      title: 'Level 3: Punjab vs Delhi NCR Stubble Smoke Corridor',
      filingDistrict: 'Central Delhi Magistrate',
      respondentDistrict: 'Sangrur / Ludhiana (Punjab)',
      status: 'MEDIATING',
      level: 3,
      levelLabel: 'Level 3 (Federal MoEFCC)',
      levelBadgeClass: 'tag-bad',
      slaCountdown: '14h 10m',
      clockLabel: 'Tier 3 (24h SLA)',
      sha256: '9a31f728c0b4317ae510de278a9c54e019b88231c51801fbde1a3892cc04b31a',
      attribution: '74% Upwind Biomass / 26% Urban Delhi Trapping',
      notes: 'ERA5 wind vector confirms 14 km/h NW advection plume intersecting Indo-Gangetic air-shed.'
    }
  ]);

  // Live OpenWeatherMap Data State
  const [owmData, setOwmData] = useState({
    temp: '31°C',
    desc: 'Hazy Sun',
    wind: 'NE 9 km/h (2.5 m/s)',
    hum: '68%',
    pm25: '38.4 µg/m³',
    pm10: '62.1 µg/m³',
    no2: '18.2 µg/m³',
    o3: '44.0 µg/m³',
    co: '420',
    so2: '6.4',
    aqiLabel: 'AQI 3 (Moderate)',
    aqiClass: 'tag-warn',
    icon: '☀️',
    updated: 'Live OWM (Chennai)'
  });

  // Modal State
  const [activeReportModal, setActiveReportModal] = useState(null);
  const [activeDisputeModalAlert, setActiveDisputeModalAlert] = useState(null);
  const [isBedcAuditModalOpen, setIsBedcAuditModalOpen] = useState(false);

  // Fetch OpenWeatherMap telemetry for selected location
  useEffect(() => {
    let target = JURISDICTIONS.find(j => j.district === selectedDistrict);
    if (!target) target = JURISDICTIONS.find(j => j.state === selectedState);
    if (!target) target = JURISDICTIONS.find(j => j.nation === selectedCountry) || JURISDICTIONS[0];

    const lat = target.lat;
    const lon = target.lon;
    const label = target.district || target.state;

    async function fetchOWM() {
      try {
        const [wRes, aRes] = await Promise.all([
          fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OWM_KEY}&units=metric`),
          fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OWM_KEY}`)
        ]);

        if (wRes.ok && aRes.ok) {
          const w = await wRes.json();
          const a = await aRes.json();
          const list = a.list?.[0];
          const aqiIndex = list?.main?.aqi || 2;
          const aqiLabels = ['', 'Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
          const aqiClasses = ['', 'tag-ok', 'tag-ok', 'tag-warn', 'tag-bad', 'tag-bad'];
          const comp = list?.components || {};

          setOwmData({
            temp: `${Math.round(w.main.temp)}°C`,
            desc: w.weather?.[0]?.description || 'Hazy',
            wind: `${(w.wind?.speed * 3.6).toFixed(1)} km/h (${w.wind?.speed || 0} m/s)`,
            hum: `${w.main.humidity}%`,
            pm25: `${(comp.pm2_5 || 28).toFixed(1)} µg/m³`,
            pm10: `${(comp.pm10 || 45).toFixed(1)} µg/m³`,
            no2: `${(comp.no2 || 14).toFixed(1)} µg/m³`,
            o3: `${(comp.o3 || 32).toFixed(1)} µg/m³`,
            co: `${Math.round(comp.co || 300)}`,
            so2: `${(comp.so2 || 4.2).toFixed(1)}`,
            aqiLabel: `AQI ${aqiIndex} (${aqiLabels[aqiIndex]})`,
            aqiClass: aqiClasses[aqiIndex],
            icon: '☀️',
            updated: `Live OWM (${label})`
          });
        }
      } catch (err) {
        // Keep fallback
      }
    }

    fetchOWM();
  }, [selectedDistrict, selectedState, selectedCountry]);

  // Filtered Reports
  const filteredReports = useMemo(() => {
    const now = Date.now();
    return reports.filter(r => {
      if (selectedCountry !== 'ALL' && r.nation !== selectedCountry) return false;
      if (selectedState !== 'ALL' && r.state !== selectedState) return false;
      if (selectedDistrict !== 'ALL' && r.district !== selectedDistrict) return false;

      // Temporal filter
      const ageMs = now - new Date(r.ts).getTime();
      if (selectedTime === 'live' && ageMs > 3 * 3600 * 1000) return false;
      if (selectedTime === '24h' && ageMs > 24 * 3600 * 1000) return false;
      if (selectedTime === '7d' && ageMs > 7 * 24 * 3600 * 1000) return false;
      if (selectedTime === '30d' && ageMs > 30 * 24 * 3600 * 1000) return false;
      if (selectedTime === 'custom' && customFrom && customTo) {
        const d = new Date(r.ts).toISOString().slice(0, 10);
        if (d < customFrom || d > customTo) return false;
      }

      // Layer filter
      if (activeLayer === 'citizen' && !r.isHazard) return false;
      if (activeLayer === 'satellite' && r.pm25 < 70) return false;

      return true;
    });
  }, [reports, selectedCountry, selectedState, selectedDistrict, selectedTime, customFrom, customTo, activeLayer]);

  // Active Forecast Profile
  const activeForecast = useMemo(() => {
    if (selectedDistrict === 'Chennai' || selectedState === 'Tamil Nadu') return FORECASTS.tamilnadu;
    if (selectedState === 'Delhi' || selectedDistrict.includes('Delhi')) return FORECASTS.delhi;
    if (selectedCountry === 'CN' || selectedState === 'Beijing') return FORECASTS.beijing;
    if (selectedCountry === 'BR' || selectedState === 'São Paulo') return FORECASTS.saopaulo;
    if (selectedCountry === 'EG') return FORECASTS.cairo;
    if (selectedCountry === 'ET') return FORECASTS.addis;
    if (selectedCountry === 'IR') return FORECASTS.tehran;
    if (selectedCountry === 'SA') return FORECASTS.riyadh;
    if (selectedCountry === 'AE') return FORECASTS.dubai;
    if (selectedCountry === 'ID') return FORECASTS.jakarta;
    if (selectedCountry === 'RU') return FORECASTS.moscow;
    if (selectedCountry === 'ZA') return FORECASTS.joburg;
    return FORECASTS.tamilnadu;
  }, [selectedCountry, selectedState, selectedDistrict]);

  // Active Alerts for Tiered Dispatch
  const alerts = useMemo(() => {
    return filteredReports
      .filter(r => r.verified && r.pm25 >= 75)
      .slice(0, 6)
      .map(r => {
        const target = JURISDICTIONS.find(j => j.district === r.district) || JURISDICTIONS[0];
        const sha = `a89f41e2b583907c1248d${r.id}ec4821a783610de59942a19b88231c51801fbde1a38`;
        return {
          id: `A${r.id.slice(1)}`,
          district: r.district,
          state: r.state,
          nation: r.nation,
          office: target.office,
          tier2: target.tier2,
          tier3: target.tier3,
          sha,
          slaText: '24h SLA',
          levelBadgeClass: 'tag-bad',
          levelLabel: 'Tier 1 Priority',
          rawReport: r
        };
      });
  }, [filteredReports]);

  // Handlers
  const handleCorridorSelect = (nation, state, district) => {
    setSelectedCountry(nation);
    setSelectedState(state);
    setSelectedDistrict(district);
  };

  const handleCountryChange = (c) => {
    setSelectedCountry(c);
    setSelectedState('ALL');
    setSelectedDistrict('ALL');
  };

  const handleStateChange = (s) => {
    setSelectedState(s);
    setSelectedDistrict('ALL');
  };

  const handleResetFilters = () => {
    setSelectedCountry('ALL');
    setSelectedState('Tamil Nadu');
    setSelectedDistrict('Chennai');
    setSelectedTime('live');
    setActiveLayer('all');
  };

  const handleExportCSV = () => {
    const headers = 'ID,Nation,State,District,Lat,Lon,Type,PM25,Confidence,Verified,Timestamp\n';
    const rows = filteredReports.map(r =>
      `${r.id},${r.nation},"${r.state}","${r.district}",${r.lat.toFixed(4)},${r.lon.toFixed(4)},${r.type},${r.pm25},${r.conf},${r.verified},"${new Date(r.ts).toISOString()}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `brics_aether_observations_${Date.now()}.csv`;
    link.click();
  };

  const handleSubmitObservation = ({ pm25, img }) => {
    const target = JURISDICTIONS.find(j => j.district === selectedDistrict) || JURISDICTIONS[0];
    const newReport = {
      id: 'R' + String(5000 + reports.length + 1),
      nation: target.nation,
      state: target.state,
      district: target.district,
      lat: target.lat + (Math.random() - 0.5) * 0.02,
      lon: target.lon + (Math.random() - 0.5) * 0.02,
      type: 'Industrial_Plume',
      isHazard: true,
      conf: 0.934,
      pm25: pm25 || 112,
      verified: true,
      ts: new Date(),
      office: target.office,
      lang: target.lang,
      img: img || 'https://picsum.photos/seed/newrep/300/200'
    };
    setReports(prev => [newReport, ...prev]);
  };

  const handleFileDispute = (reportOrAlert) => {
    setActiveDisputeModalAlert({
      id: reportOrAlert.id,
      district: reportOrAlert.district,
      state: reportOrAlert.state,
      nation: reportOrAlert.nation
    });
  };

  const handleSubmitDispute = (disputeData) => {
    const newEntry = {
      id: `DISP-${100 + disputes.length + 1}`,
      title: `Level ${disputeData.level}: ${disputeData.district} (${disputeData.state}) ${disputeData.reason}`,
      filingDistrict: `${disputeData.district} Authority`,
      respondentDistrict: 'Designated RACI Authority',
      status: 'MEDIATING',
      level: disputeData.level,
      levelLabel: `Level ${disputeData.level}`,
      levelBadgeClass: disputeData.level >= 4 ? 'tag-bad' : 'tag-warn',
      slaCountdown: disputeData.level === 4 ? '71h 59m' : disputeData.level === 5 ? '47h 59m' : '23h 59m',
      clockLabel: disputeData.level === 4 ? 'Bilateral (72h SLA)' : disputeData.level === 5 ? 'BEDC Council (48h SLA)' : 'Tier 2/3 (24h SLA)',
      sha256: 'b47e8291a0c841e2b583907c1248dec4821a783610de59942a19b88231c51801',
      attribution: 'Pending PINN & TEE Enclave Re-run',
      notes: disputeData.notes
    };
    setDisputes(prev => [newEntry, ...prev]);
    setActiveView('disputes');
  };

  const handleResolveDispute = (disputeId) => {
    setDisputes(prev => prev.map(d => {
      if (d.id === disputeId) {
        return {
          ...d,
          status: 'RESOLVED',
          notes: d.notes + ' [RESOLVED: Attribution mutually accepted via bilateral protocol]'
        };
      }
      return d;
    }));
  };

  const handleSeedDemoDispute = () => {
    const demo = {
      id: `DISP-${100 + disputes.length + 1}`,
      title: 'Level 5 (BEDC): Transboundary Amazon Basin Haze (Brazil vs Colombia)',
      filingDistrict: 'Amazonas State Environmental Authority',
      respondentDistrict: 'Leticia Border Directorate',
      status: 'MEDIATING',
      level: 5,
      levelLabel: 'Level 5 (BEDC Council)',
      levelBadgeClass: 'tag-bad',
      slaCountdown: '47h 12m',
      clockLabel: 'BEDC Council (48h SLA)',
      sha256: '7c891f20b583907c1248dec4821a783610de59942a19b88231c51801fbde1a38',
      attribution: '62% Transboundary Biomass Transport / 38% Local Trapping',
      notes: 'Amazon basin transboundary smoke transport under SE trade winds requiring sovereign BEDC Council hearing.'
    };
    setDisputes(prev => [demo, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans">
      <Header
        livePillText="220+ Districts Live (H3 Res 8)"
        selectedLang={selectedLang}
        onLangChange={setSelectedLang}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
      />

      <div className="flex flex-1 max-w-full">
        <Sidebar
          activeView={activeView}
          onSwitchView={setActiveView}
          isOpen={isSidebarOpen}
          jurisdictions={JURISDICTIONS}
          selectedCountry={selectedCountry}
          selectedState={selectedState}
          selectedDistrict={selectedDistrict}
          selectedTime={selectedTime}
          customFrom={customFrom}
          customTo={customTo}
          onCountryChange={handleCountryChange}
          onStateChange={handleStateChange}
          onDistrictChange={setSelectedDistrict}
          onTimeChange={setSelectedTime}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
          onResetFilters={handleResetFilters}
          onExportCSV={handleExportCSV}
          metrics={{
            validationsCount: filteredReports.length,
            verifiedCount: filteredReports.filter(r => r.verified).length,
            plumesCount: Math.round(filteredReports.length / 3),
            dispatchTime: '<42s',
            locationLabel: selectedDistrict !== 'ALL' ? `${selectedDistrict}, ${selectedState}` : selectedState !== 'ALL' ? selectedState : 'All BRICS+ (11 Nations)',
            timeLabel: selectedTime === 'live' ? 'Live (Last 3h)' : selectedTime === '24h' ? 'Last 24h' : selectedTime
          }}
          owmData={owmData}
          disputesCount={disputes.filter(d => d.status === 'MEDIATING').length}
        />

        <main className="flex-1 min-w-0 p-4 lg:p-5 flex flex-col gap-4 overflow-y-auto">
          {activeView === 'ops' ? (
            <>
              <Map
                reports={filteredReports}
                activeLayer={activeLayer}
                onLayerChange={setActiveLayer}
                mapTitle={`Atmospheric Telemetry • ${selectedDistrict !== 'ALL' ? selectedDistrict : selectedState}`}
                selectedDistrict={selectedDistrict}
                selectedState={selectedState}
                selectedCountry={selectedCountry}
                jurisdictions={JURISDICTIONS}
                onSelectCorridor={handleCorridorSelect}
                onOpenReportModal={setActiveReportModal}
              />

              <ForecastChart
                forecastData={activeForecast}
                locationLabel={selectedDistrict !== 'ALL' ? selectedDistrict : selectedState}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-1">
                <GroundValidation
                  recentReports={filteredReports}
                  onOpenReportModal={setActiveReportModal}
                  onSubmitReport={handleSubmitObservation}
                  selectedDistrict={selectedDistrict}
                  selectedState={selectedState}
                />

                <TieredDispatch
                  alerts={alerts}
                  onOpenReportModal={setActiveReportModal}
                  onOpenDisputeModal={handleFileDispute}
                  onOpenBedcAuditModal={() => setIsBedcAuditModalOpen(true)}
                  selectedDistrict={selectedDistrict}
                  selectedState={selectedState}
                />
              </div>
            </>
          ) : (
            <DisputeLedger
              disputes={disputes}
              onResolveDispute={handleResolveDispute}
              onOpenBedcAuditModal={() => setIsBedcAuditModalOpen(true)}
              onSeedDemoDispute={handleSeedDemoDispute}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      {activeReportModal && (
        <ReportModal
          report={activeReportModal}
          onClose={() => setActiveReportModal(null)}
          onFileDispute={handleFileDispute}
        />
      )}

      {activeDisputeModalAlert && (
        <DisputeModal
          targetAlert={activeDisputeModalAlert}
          onClose={() => setActiveDisputeModalAlert(null)}
          onSubmitDispute={handleSubmitDispute}
        />
      )}

      {isBedcAuditModalOpen && (
        <BedcAuditModal
          onClose={() => setIsBedcAuditModalOpen(false)}
        />
      )}
    </div>
  );
}
export default App;
