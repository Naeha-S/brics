import React from 'react';

export function TieredDispatch({
  alerts,
  onOpenReportModal,
  onOpenDisputeModal,
  onOpenBedcAuditModal,
  selectedDistrict,
  selectedState
}) {
  return (
    <section className="card p-3.5" aria-label="RACI Escalation and Sovereign Authority Dispatch">
      <div className="flex justify-between items-center mb-2.5">
        <div>
          <h4 className="text-[11px] font-bold tracking-wider uppercase text-[#0F172A] flex items-center">
            Tiered Dispatch & Sovereign Routing
            <span className="tooltip-trigger" title="Primary owner elected via max(intersection area × pop density) with SHA-256 evidence hashing at T0.">ℹ</span>
          </h4>
          <p className="text-[11px] text-[#64748B]">
            Automated RACI escalation • Primary jurisdiction elected at T0
          </p>
        </div>
        <button
          className="btn btn-light text-xs"
          onClick={() => onOpenBedcAuditModal()}
          title="Open BEDC Confidential Space TEE cryptographic audit log"
        >
          BEDC TEE Audit
        </button>
      </div>

      <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center p-4 text-xs text-[#64748B] border border-dashed border-[#E2E8F0] rounded">
            No active high-risk alerts in active filter window.
          </div>
        ) : (
          alerts.map(a => (
            <div key={a.id} className="border border-[#E2E8F0] rounded-lg p-3 bg-white flex flex-col gap-2 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className={`tag ${a.levelBadgeClass}`}>{a.levelLabel}</span>
                  <b className="text-xs text-[#0F172A]">{a.district}, {a.state} ({a.nation})</b>
                </div>
                <span className="font-mono text-[11px] text-[#64748B]">{a.slaText}</span>
              </div>

              <div className="text-[11px] text-[#475569] leading-snug">
                <b>Primary Owner:</b> {a.office} • <b>Tier 2:</b> {a.tier2} • <b>Tier 3:</b> {a.tier3}
              </div>

              <div className="font-mono text-[10px] text-[#64748B] bg-[#F1F5F9] p-1.5 rounded flex items-center justify-between">
                <span>SHA-256 (T0): {a.sha.substring(0, 16)}…{a.sha.substring(56)}</span>
                <span className="text-[#0D9488] font-bold">ST_INTERSECTS ✓</span>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  className="btn btn-light text-xs py-1"
                  onClick={() => onOpenReportModal(a.rawReport)}
                >
                  View Evidence
                </button>
                <button
                  className="btn btn-dark text-xs py-1"
                  onClick={() => onOpenDisputeModal(a)}
                >
                  File Dispute / Audit
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
