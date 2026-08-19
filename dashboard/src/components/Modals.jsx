import React, { useState } from 'react';

export function ReportModal({ report, onClose, onFileDispute }) {
  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-lg w-full overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-3.5 px-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
            Atmospheric Observation #{report.id}
          </h3>
          <button className="text-slate-400 hover:text-slate-700 text-lg leading-none" onClick={onClose}>×</button>
        </div>

        <div className="p-4 overflow-y-auto flex flex-col gap-3">
          <img src={report.img} alt={report.type} className="w-full h-[180px] object-cover rounded-lg border border-[#E2E8F0]" />

          <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#F1F5F9] p-3 rounded-lg border border-[#E2E8F0]">
            <div><span className="text-[#64748B]">Jurisdiction:</span> <b>{report.district}, {report.state}</b></div>
            <div><span className="text-[#64748B]">Country:</span> <b>{report.nation}</b></div>
            <div><span className="text-[#64748B]">Classification:</span> <b>{report.type.replace('_', ' ')}</b></div>
            <div><span className="text-[#64748B]">Confidence (Ci):</span> <b>{report.conf}</b></div>
            <div><span className="text-[#64748B]">PM2.5 Sensor:</span> <b>{report.pm25} µg/m³</b></div>
            <div><span className="text-[#64748B]">Status:</span> <b className={report.verified ? "text-[#059669]" : "text-[#D97706]"}>{report.verified ? 'Verified (Ci ≥ 0.70)' : 'Queued'}</b></div>
          </div>

          <div className="text-xs text-[#475569] leading-relaxed">
            <b>RACI Sovereign Routing:</b> Primary responsibility assigned to {report.office}. Cross-verified with Sentinel-5P TROPOMI column and ERA5 boundary layer height.
          </div>
        </div>

        <div className="p-3 px-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end gap-2">
          <button className="btn btn-light text-xs" onClick={onClose}>Close</button>
          <button className="btn btn-dark text-xs" onClick={() => { onClose(); onFileDispute(report); }}>
            File Dispute / Audit
          </button>
        </div>
      </div>
    </div>
  );
}

export function DisputeModal({ targetAlert, onClose, onSubmitDispute }) {
  const [reason, setReason] = useState('Transboundary Wind Drift / False Attribution');
  const [level, setLevel] = useState('2');
  const [notes, setNotes] = useState('');

  if (!targetAlert) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmitDispute({
      alertId: targetAlert.id,
      district: targetAlert.district,
      state: targetAlert.state,
      nation: targetAlert.nation,
      reason,
      level: parseInt(level),
      notes: notes || 'Dispute lodged against primary RACI ownership. Requesting PINN back-trace re-evaluation.'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-lg w-full overflow-hidden shadow-xl flex flex-col">
        <div className="p-3.5 px-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
            File Sovereign Dispute / RACI Re-attribution
          </h3>
          <button className="text-slate-400 hover:text-slate-700 text-lg leading-none" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
          <div className="text-xs text-[#475569]">
            Disputing Alert <b>#{targetAlert.id}</b> for <b>{targetAlert.district}, {targetAlert.state} ({targetAlert.nation})</b>.
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] uppercase font-semibold text-[#64748B]">Escalation Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="p-2 rounded border border-[#E2E8F0] text-xs font-medium text-[#0F172A] outline-none"
            >
              <option value="1">Level 1: Intra-District / Municipal Review (6h SLA)</option>
              <option value="2">Level 2: Inter-District / State Board (24h SLA)</option>
              <option value="3">Level 3: Inter-State / Federal Ministry (24h SLA)</option>
              <option value="4">Level 4: Transboundary Bilateral Commission (72h SLA)</option>
              <option value="5">Level 5: BRICS Environmental Dispute Council (48h SLA)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] uppercase font-semibold text-[#64748B]">Dispute Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="p-2 rounded border border-[#E2E8F0] text-xs font-medium text-[#0F172A] outline-none"
            >
              <option value="Transboundary Wind Drift / False Attribution">Transboundary Wind Drift / False Attribution</option>
              <option value="Baseline Background Pollution Inversion">Baseline Background Pollution Inversion</option>
              <option value="Sensor Calibration Anomaly / Sensor Fault">Sensor Calibration Anomaly / Sensor Fault</option>
              <option value="Offshore Marine / Sea-salt Aerosol Masking">Offshore Marine / Sea-salt Aerosol Masking</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] uppercase font-semibold text-[#64748B]">Counter-Evidence / Technical Memo</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cite local meteorological stations, wind sensors, or satellite overrides…"
              className="p-2 rounded border border-[#E2E8F0] text-xs outline-none focus:border-[#0D9488]"
            />
          </div>

          <div className="p-3 bg-[#F0FDFA] border border-[#99F6E4] rounded text-[11px] text-[#115E59] font-mono leading-relaxed">
            <b>Cryptographic Anchoring:</b> Filing will generate a T0 SHA-256 hash locked in the Cloud SQL ledger and schedule Cloud Tasks SLA clocks.
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
            <button type="button" className="btn btn-light text-xs" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-dark text-xs">Submit to Sovereign Ledger</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BedcAuditModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-2xl w-full overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-3.5 px-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
            <span>🛡️</span> BEDC Confidential Space TEE Audit Protocol
          </h3>
          <button className="text-slate-400 hover:text-slate-700 text-lg leading-none" onClick={onClose}>×</button>
        </div>

        <div className="p-4 overflow-y-auto flex flex-col gap-3 font-mono text-xs">
          <div className="bg-[#1E293B] text-[#E2E8F0] p-3 rounded-lg leading-relaxed text-[11px]">
            <div className="text-[#0D9488] font-bold mb-1">=== GOOGLE CLOUD CONFIDENTIAL SPACE ATTESTATION ===</div>
            <div>• TEE Platform: AMD SEV-SNP Confidential VM (n2d-standard-8)</div>
            <div>• Attestation Service: Google Cloud Attestation Token (OIDC Verified)</div>
            <div>• Memory Encryption: Hardware Root-of-Trust (HW AES-128)</div>
            <div>• Data Sovereign Boundary: Sovereign GCS Buckets (asia-south1 / southamerica-east1 / isolated CN)</div>
            <div>• SHA-256 Ledger Anchor: a89f…41e2 (Immutable at T0)</div>
          </div>

          <div className="bg-[#F1F5F9] p-3 rounded-lg border border-[#E2E8F0] text-[#475569] leading-relaxed text-[11px]">
            <b className="text-[#0F172A] block mb-1">Multi-Sovereignty Guarantees:</b>
            Disputes between sovereign member states (e.g. cross-border agricultural smoke or industrial plumes) are re-evaluated inside hardware-isolated Confidential VMs without granting foreign access to raw citizen biometric/location imagery. Only the cryptographic attestation memo and mathematical attribution percentages are emitted.
          </div>
        </div>

        <div className="p-3 px-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end">
          <button className="btn btn-dark text-xs" onClick={onClose}>Close Audit Inspector</button>
        </div>
      </div>
    </div>
  );
}
