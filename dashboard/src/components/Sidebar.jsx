import React from 'react';

export function Sidebar({
  activeView,
  onSwitchView,
  isOpen,
  jurisdictions,
  selectedCountry,
  selectedState,
  selectedDistrict,
  selectedTime,
  customFrom,
  customTo,
  onCountryChange,
  onStateChange,
  onDistrictChange,
  onTimeChange,
  onCustomFromChange,
  onCustomToChange,
  onResetFilters,
  onExportCSV,
  metrics,
  owmData,
  disputesCount
}) {
  const nations = [...new Set(jurisdictions.map(j => j.nation))].sort();
  const nationNames = {
    IN: 'India', BR: 'Brazil', CN: 'China', RU: 'Russia', ZA: 'South Africa',
    EG: 'Egypt', ET: 'Ethiopia', IR: 'Iran', SA: 'Saudi Arabia', AE: 'United Arab Emirates', ID: 'Indonesia'
  };

  const states = [...new Set(
    jurisdictions
      .filter(j => selectedCountry === 'ALL' || j.nation === selectedCountry)
      .map(j => j.state)
  )].sort();

  const districts = [...new Set(
    jurisdictions
      .filter(j => (selectedCountry === 'ALL' || j.nation === selectedCountry) && (selectedState === 'ALL' || j.state === selectedState))
      .map(j => j.district)
  )].sort();

  return (
    <aside className={`w-[300px] flex-shrink-0 bg-white border-r border-[#E2E8F0] h-[calc(100vh-52px)] sticky top-[52px] overflow-y-auto flex flex-col gap-3 p-4 z-30 ${isOpen ? 'flex' : 'hidden md:flex'}`}>
      {/* Navigation View Switcher */}
      <nav className="flex flex-col gap-1.5" aria-label="Primary Navigation">
        <button
          className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors text-left ${
            activeView === 'ops' ? 'bg-[#1E293B] text-white border-[#1E293B]' : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-[#F1F5F9]'
          }`}
          onClick={() => onSwitchView('ops')}
        >
          <span>● Operations</span>
          <small className="opacity-80">Map • Feeds</small>
        </button>
        <button
          className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors text-left ${
            activeView === 'disputes' ? 'bg-[#1E293B] text-white border-[#1E293B]' : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-[#F1F5F9]'
          }`}
          onClick={() => onSwitchView('disputes')}
        >
          <span>○ Evidence Ledger</span>
          <small className="opacity-80">{disputesCount} Active</small>
        </button>
      </nav>

      {/* Cascading Geography & Temporal Filters */}
      <div className="flex flex-col gap-2.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg p-3">
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] tracking-wider uppercase text-[#64748B] font-semibold flex items-center">
            Country
            <span className="tooltip-trigger" title="Filter atmospheric observations across 11 BRICS+ member states.">ℹ</span>
          </label>
          <select
            value={selectedCountry}
            onChange={(e) => onCountryChange(e.target.value)}
            className="p-1.5 rounded border border-[#E2E8F0] bg-white text-xs font-medium text-[#0F172A] outline-none focus:border-[#0D9488]"
          >
            <option value="ALL">All BRICS+ (11 Nations)</option>
            {nations.map(n => (
              <option key={n} value={n}>{nationNames[n] || n} ({n})</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] tracking-wider uppercase text-[#64748B] font-semibold flex items-center">
            State / Province
            <span className="tooltip-trigger" title="Primary administrative region (GAUL Level 1).">ℹ</span>
          </label>
          <select
            value={selectedState}
            onChange={(e) => onStateChange(e.target.value)}
            className="p-1.5 rounded border border-[#E2E8F0] bg-white text-xs font-medium text-[#0F172A] outline-none focus:border-[#0D9488]"
          >
            <option value="ALL">All States / Provinces</option>
            {states.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] tracking-wider uppercase text-[#64748B] font-semibold flex items-center">
            District / Municipality
            <span className="tooltip-trigger" title="Local district level (GAUL Level 2) with automated district zoom.">ℹ</span>
          </label>
          <select
            value={selectedDistrict}
            onChange={(e) => onDistrictChange(e.target.value)}
            className="p-1.5 rounded border border-[#E2E8F0] bg-white text-xs font-medium text-[#0F172A] outline-none focus:border-[#0D9488]"
          >
            <option value="ALL">All Districts / Municipalities</option>
            {districts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] tracking-wider uppercase text-[#64748B] font-semibold flex items-center">
            Time Window
            <span className="tooltip-trigger" title="Observation temporal window. Live displays last 3 hours of telemetry.">ℹ</span>
          </label>
          <select
            value={selectedTime}
            onChange={(e) => onTimeChange(e.target.value)}
            className="p-1.5 rounded border border-[#E2E8F0] bg-white text-xs font-medium text-[#0F172A] outline-none focus:border-[#0D9488]"
          >
            <option value="live">Live — Now (Last 3h)</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

        {selectedTime === 'custom' && (
          <div className="flex gap-1.5">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className="flex-1 min-w-0 p-1.5 rounded border border-[#E2E8F0] bg-white text-xs"
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => onCustomToChange(e.target.value)}
              className="flex-1 min-w-0 p-1.5 rounded border border-[#E2E8F0] bg-white text-xs"
            />
          </div>
        )}

        <div className="flex gap-1.5 mt-1">
          <button className="btn btn-light flex-1 text-xs" onClick={onResetFilters}>Reset</button>
          <button className="btn btn-dark flex-1 text-xs" onClick={onExportCSV}>Export CSV</button>
        </div>
      </div>

      {/* Filter Summary */}
      <div className="font-mono text-[11px] text-[#475569] bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg p-2.5 flex flex-col gap-1">
        <div>Filtered: <b className="text-[#0F172A]">{metrics.validationsCount}</b> validations • <b className="text-[#0F172A]">{metrics.plumesCount}</b> plumes</div>
        <div className="text-[10px] text-[#64748B]">{metrics.locationLabel}</div>
        <div className="text-[10px] text-[#64748B]">{metrics.timeLabel}</div>
      </div>

      {/* KPI Container */}
      <div className="flex flex-col border border-[#E2E8F0] rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="flex justify-between items-center p-2 border-b border-[#E2E8F0]">
          <span className="font-mono text-[10px] tracking-wider uppercase text-[#64748B] flex items-center">
            Validations <span className="tooltip-trigger" title="Total citizen and sensor reports in the current filter window.">ℹ</span>
          </span>
          <div className="text-right">
            <strong className="text-xs text-[#0F172A]">{metrics.validationsCount}</strong>
            <span className="text-[11px] text-[#475569] ml-1">({metrics.verifiedCount} verified)</span>
          </div>
        </div>
        <div className="flex justify-between items-center p-2 border-b border-[#E2E8F0]">
          <span className="font-mono text-[10px] tracking-wider uppercase text-[#64748B] flex items-center">
            Plumes <span className="tooltip-trigger" title="Spatial clusters detected at Uber H3 Resolution 8 (~0.74 km² per cell).">ℹ</span>
          </span>
          <div className="text-right">
            <strong className="text-xs text-[#0F172A]">{metrics.plumesCount}</strong>
            <span className="text-[11px] text-[#475569] ml-1">H3 Res 8</span>
          </div>
        </div>
        <div className="flex justify-between items-center p-2 border-b border-[#E2E8F0]">
          <span className="font-mono text-[10px] tracking-wider uppercase text-[#64748B] flex items-center">
            72h PINN <span className="tooltip-trigger" title="Physics-Informed Neural Network atmospheric forecast model accuracy.">ℹ</span>
          </span>
          <div className="text-right">
            <strong className="text-xs text-[#0F172A]">≥85%</strong>
            <span className="text-[11px] text-[#475569] ml-1">PINN</span>
          </div>
        </div>
        <div className="flex justify-between items-center p-2">
          <span className="font-mono text-[10px] tracking-wider uppercase text-[#64748B] flex items-center">
            Dispatch SLA <span className="tooltip-trigger" title="Median automated dispatch time with SHA-256 evidence chain.">ℹ</span>
          </span>
          <div className="text-right">
            <strong className="text-xs text-[#0F172A]">{metrics.dispatchTime}</strong>
            <span className="text-[11px] text-[#475569] ml-1">SHA-256</span>
          </div>
        </div>
      </div>

      {/* Live OWM Telemetry Card */}
      <div className="card p-3 border border-[#E2E8F0] shadow-none">
        <h4 className="text-[11px] font-bold tracking-wider uppercase text-[#0F172A] flex items-center justify-between mb-2">
          <span>Live Environment</span>
          <span className={`tag ${owmData.aqiClass}`}>{owmData.aqiLabel}</span>
        </h4>
        <div className="flex items-center gap-2.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-md p-2.5">
          <div className="text-xl leading-none">{owmData.icon}</div>
          <div>
            <b className="text-sm font-bold text-[#0F172A]">{owmData.temp}</b>
            <div className="text-[11px] text-[#475569]">{owmData.desc}</div>
            <div className="text-[10px] text-[#64748B]">{owmData.wind}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[10px] text-[#64748B]">Humidity</div>
            <b className="text-xs text-[#0F172A]">{owmData.hum}</b>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 mt-2 text-[11px] font-mono">
          <div><span className="text-[#64748B]">PM2.5:</span> <b className="text-[#0F172A]">{owmData.pm25}</b></div>
          <div><span className="text-[#64748B]">PM10:</span> <b className="text-[#0F172A]">{owmData.pm10}</b></div>
          <div><span className="text-[#64748B]">NO₂:</span> <b className="text-[#0F172A]">{owmData.no2}</b></div>
          <div><span className="text-[#64748B]">O₃:</span> <b className="text-[#0F172A]">{owmData.o3}</b></div>
        </div>
        <div className="text-[10px] text-[#64748B] mt-1.5 flex justify-between">
          <span>CO {owmData.co} • SO₂ {owmData.so2}</span>
          <span>{owmData.updated}</span>
        </div>
      </div>

      {/* Evidence Snapshot */}
      <div className="card p-3 shadow-none">
        <h4 className="text-[11px] font-bold tracking-wider uppercase text-[#0F172A] flex items-center justify-between mb-1">
          <span>Evidence Ledger</span>
          <span className="font-mono text-[11px] text-[#64748B]">{disputesCount} active</span>
        </h4>
        <p className="text-[11px] text-[#475569] leading-snug">
          {disputesCount > 0 ? `${disputesCount} active mediation cases under sovereign RACI review.` : 'No disputes in active filter. File directly from an alert or seed demo.'}
        </p>
        <button className="btn btn-light w-full mt-2 text-xs" onClick={() => onSwitchView('disputes')}>
          Open Full Ledger →
        </button>
      </div>

      <div className="text-[10px] text-[#64748B] text-center py-1">
        220+ districts populated • Automated district zoom • Multi-point telemetry
      </div>
    </aside>
  );
}
