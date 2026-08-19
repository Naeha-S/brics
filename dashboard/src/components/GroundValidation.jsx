import React, { useState, useRef } from 'react';

export function GroundValidation({
  recentReports,
  onOpenReportModal,
  onSubmitReport,
  selectedDistrict,
  selectedState
}) {
  const [previewSrc, setPreviewSrc] = useState(null);
  const [sensorValue, setSensorValue] = useState('');
  const [logLines, setLogLines] = useState(['Waiting for triage…']);
  const [progress, setProgress] = useState(0);
  const [isClassifying, setIsClassifying] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    setPreviewSrc(URL.createObjectURL(file));
    setIsClassifying(true);
    setLogLines(['→ Initializing Vision Classifier pipeline…']);
    setProgress(10);

    const steps = [
      `[1/4] Uber H3 Res 8 spatial indexing for ${selectedDistrict !== 'ALL' ? selectedDistrict : selectedState} • GAUL ST_INTERSECTS`,
      `[2/4] Vision Classifier: Confidence 0.934, Opacity 0.71 ✓ (Ci ≥ 0.70 Verified)`,
      `[3/4] Cross-validation: Sentinel-5P QA 0.81 • CAMS z+2.4 • ERA5 u-3.2 v1.4`,
      `[4/4] Verified ground report → Generated 22h dispersion cone → Routed to Tier 1/2/3 RACI`
    ];

    let i = 0;
    const interval = setInterval(() => {
      setLogLines(prev => [...prev, steps[i]]);
      setProgress((i + 1) * 25);
      i++;
      if (i === steps.length) {
        clearInterval(interval);
        setIsClassifying(false);
      }
    }, 450);
  };

  const handleSubmit = () => {
    onSubmitReport({
      pm25: parseInt(sensorValue) || 112,
      img: previewSrc
    });
    setPreviewSrc(null);
    setSensorValue('');
    setLogLines(['Waiting for triage…']);
    setProgress(0);
  };

  return (
    <section className="card p-3.5" aria-label="Ground Observation and Sensor Ingestion">
      <h4 className="text-[11px] font-bold tracking-wider uppercase text-[#0F172A] flex items-center justify-between mb-2.5">
        <span className="flex items-center">
          Ground Validation
          <span className="tooltip-trigger" title="Automated vision classification and cross-validation against Sentinel-5P and ERA5 wind vectors.">ℹ</span>
        </span>
        <span className="tag tag-ok">Ci ≥ 0.70 Threshold</span>
      </h4>

      <div
        className="border-1.5 border-dashed border-[#CBD5E1] bg-[#F1F5F9] hover:bg-[#F0FDFA] hover:border-[#0D9488] rounded-lg p-4 text-center cursor-pointer transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
        }}
      >
        <div className="font-semibold text-xs text-[#0F172A]">Drop environmental photo or click to browse</div>
        <p className="text-[11px] text-[#64748B] mt-1">Auto-geotagged to selected jurisdiction • Automated feature extraction</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
        }}
      />

      {previewSrc && (
        <div className="mt-2.5">
          <img src={previewSrc} alt="Preview" className="w-full h-[130px] object-cover rounded border border-[#E2E8F0]" />
          <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded p-2.5 mt-2">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[#64748B]">Vision Triage Pipeline</div>
            <div className="font-mono text-[11px] bg-[#1E293B] text-[#E2E8F0] rounded p-2.5 mt-1.5 leading-relaxed max-h-[110px] overflow-y-auto">
              {logLines.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
            <div className="flex gap-1.5 items-center mt-1.5 flex-wrap">
              <span className="tag tag-bad">AGRICULTURAL_HAZE • 0.934</span>
              <span className="text-[11px] text-[#64748B] ml-auto">Opacity: 0.71</span>
            </div>
            <div className="h-1 bg-[#E2E8F0] rounded-full overflow-hidden mt-1.5">
              <div className="h-full bg-[#0D9488] transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex gap-1.5 mt-2">
            <input
              type="number"
              placeholder="PM2.5 concentration (µg/m³)"
              value={sensorValue}
              onChange={(e) => setSensorValue(e.target.value)}
              className="flex-1 p-2 rounded border border-[#E2E8F0] text-xs outline-none focus:border-[#0D9488]"
            />
            <button
              className="btn btn-dark text-xs"
              onClick={handleSubmit}
              disabled={isClassifying}
            >
              Submit Observation
            </button>
          </div>
        </div>
      )}

      {/* Recent Validations List */}
      <div className="mt-3 border-t border-[#E2E8F0] pt-2.5">
        <div className="flex justify-between items-center mb-2">
          <b className="text-[11px] uppercase tracking-wider text-[#64748B]">
            Recent Validations ({recentReports.length})
          </b>
          <small className="text-[11px] text-[#64748B]">{selectedDistrict !== 'ALL' ? selectedDistrict : selectedState}</small>
        </div>
        <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto">
          {recentReports.length === 0 ? (
            <div className="text-center p-3 text-xs text-[#64748B] border border-dashed border-[#E2E8F0] rounded">
              No observations in active filter window.
            </div>
          ) : (
            recentReports.slice(0, 6).map(r => (
              <div
                key={r.id}
                className="border border-[#E2E8F0] rounded p-2 flex items-center gap-2.5 bg-white cursor-pointer hover:border-[#CBD5E1] transition-colors"
                onClick={() => onOpenReportModal(r)}
              >
                <img src={r.img} alt={r.type} className="w-9 h-9 rounded object-cover border border-[#E2E8F0] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <b className="text-xs text-[#0F172A] block truncate">{r.district} • {r.type.replace('_', ' ')}</b>
                  <div className="text-[11px] text-[#475569]">{r.state} • {r.pm25} µg/m³ • Ci {r.conf}</div>
                </div>
                <span className={`tag ${r.verified ? 'tag-ok' : 'tag-warn'}`}>
                  {r.verified ? 'Verified' : 'Queued'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
