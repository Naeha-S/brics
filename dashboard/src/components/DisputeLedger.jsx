import React from 'react';

export function DisputeLedger({
  disputes,
  onResolveDispute,
  onOpenBedcAuditModal,
  onSeedDemoDispute
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
            Sovereign Dispute & Mediation Ledger (Levels 1–5 BEDC)
          </h2>
          <p className="text-xs text-[#475569] mt-0.5">
            Immutable T0 evidence packages • Physics-Informed back-trace attribution • Hierarchical SLA clocks
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-light text-xs" onClick={onSeedDemoDispute}>
            + Seed Demo Dispute
          </button>
          <button className="btn btn-dark text-xs" onClick={() => onOpenBedcAuditModal()}>
            BEDC Council Audit Log
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {disputes.length === 0 ? (
          <div className="col-span-full card p-8 text-center border-dashed border-[#CBD5E1]">
            <div className="text-2xl mb-2">⚖️</div>
            <h3 className="text-sm font-bold text-[#0F172A]">No Disputes Currently Logged</h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
              All atmospheric dispersion plumes within the current filter are operating under standard RACI consensus. You can file a dispute directly from any alert in the Operations view or seed a demo case.
            </p>
            <button className="btn btn-dark text-xs mt-4" onClick={onSeedDemoDispute}>
              Seed Demo Transboundary Case
            </button>
          </div>
        ) : (
          disputes.map(d => (
            <div key={d.id} className="card p-4 flex flex-col gap-3 bg-white">
              <div className="flex justify-between items-start">
                <span className={`tag ${d.levelBadgeClass}`}>{d.levelLabel}</span>
                <span className="font-mono text-[11px] text-[#64748B]">{d.status}</span>
              </div>

              <div>
                <b className="text-xs text-[#0F172A] block">{d.title}</b>
                <div className="text-[11px] text-[#475569] mt-0.5">
                  <b>Filing Party:</b> {d.filingDistrict} • <b>Respondent:</b> {d.respondentDistrict}
                </div>
              </div>

              <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded p-2 text-[11px] font-mono flex flex-col gap-1">
                <div><b>SLA Countdown:</b> <span className="text-[#991B1B] font-bold">{d.slaCountdown}</span> ({d.clockLabel})</div>
                <div className="truncate"><b>T0 Hash:</b> {d.sha256}</div>
                <div><b>Attribution:</b> {d.attribution}</div>
              </div>

              <p className="text-[11px] text-[#475569] leading-snug">
                {d.notes}
              </p>

              <div className="flex gap-2 mt-auto pt-2 border-t border-[#E2E8F0]">
                {d.status !== 'RESOLVED' ? (
                  <button
                    className="btn btn-dark flex-1 text-xs py-1.5"
                    onClick={() => onResolveDispute(d.id)}
                  >
                    Resolve & Sign Closure
                  </button>
                ) : (
                  <span className="text-center w-full font-mono text-[11px] text-[#059669] font-bold py-1">
                    ✓ Resolved & Signed in Sovereign Ledger
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
