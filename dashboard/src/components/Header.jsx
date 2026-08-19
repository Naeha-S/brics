import React from 'react';

export function Header({ livePillText, selectedLang, onLangChange, onToggleSidebar }) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-sm">
      <div className="h-[52px] flex items-center justify-between gap-4 px-4 max-w-full">
        <div className="flex items-center gap-3">
          <button 
            className="md:hidden w-8 h-8 rounded border border-[#E2E8F0] bg-white grid place-items-center cursor-pointer text-slate-800"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation sidebar"
          >
            ☰
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-[30px] h-[30px] rounded bg-[#1E293B] grid place-items-center text-white font-bold text-xs tracking-tight border border-white/10" aria-hidden="true">
              Æ
            </div>
            <div>
              <h1 className="text-[13px] font-bold text-[#0F172A] tracking-tight flex items-center gap-1.5 leading-tight">
                BRICS-AETHER <span className="font-normal text-[#64748B] text-[11px]">| Sovereign Clean Air</span>
              </h1>
              <p className="text-[11px] text-[#475569] font-medium leading-none">
                Federated Atmospheric Observation & Dispute Platform
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1 bg-[#F1F5F9] border border-[#E2E8F0] px-2 py-0.5 rounded-full" title="BRICS+ 11 Member States">
            <span className="text-xs leading-none">🇧🇷</span>
            <span className="text-xs leading-none">🇷🇺</span>
            <span className="text-xs leading-none">🇮🇳</span>
            <span className="text-xs leading-none">🇨🇳</span>
            <span className="text-xs leading-none">🇿🇦</span>
            <span className="text-xs leading-none">🇪🇬</span>
            <span className="text-xs leading-none">🇪🇹</span>
            <span className="text-xs leading-none">🇮🇷</span>
            <span className="text-xs leading-none">🇸🇦</span>
            <span className="text-xs leading-none">🇦🇪</span>
            <span className="text-xs leading-none">🇮🇩</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[11px] font-semibold px-2.5 py-1 rounded-full border border-[#99F6E4] bg-[#F0FDFA] text-[#115E59] flex items-center gap-1.5" aria-live="polite">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" />
            {livePillText}
          </span>
          <select 
            value={selectedLang}
            onChange={(e) => onLangChange(e.target.value)}
            className="border border-[#E2E8F0] bg-white rounded-lg px-2.5 py-1 text-xs font-medium text-[#0F172A] cursor-pointer outline-none focus:border-[#0D9488]"
            aria-label="Select Interface Language"
          >
            <option value="EN">EN (English)</option>
            <option value="HI">हिन्दी (Hindi)</option>
            <option value="PT">Português (PT)</option>
            <option value="RU">Русский (RU)</option>
            <option value="ZH">中文 (ZH)</option>
            <option value="AR">العربية (AR)</option>
          </select>
        </div>
      </div>
    </header>
  );
}
