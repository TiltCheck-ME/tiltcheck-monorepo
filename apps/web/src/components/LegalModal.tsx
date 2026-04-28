import React, { useState } from 'react';
import { LEGAL_DISCLAIMERS } from '@tiltcheck/shared/legal';

interface LegalModalProps {
  isOpen: boolean;
  onAccept: () => void;
  title?: string;
}

/**
 * LegalModal Component
 * Enforces mandatory regulatory disclosures before high-risk operations.
 * Minimal dependencies, styled with CSS variables from globals.css.
 */
const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onAccept, title = "LEGAL COMPLIANCE GATE" }) => {
  const [isAccepted, setIsAccepted] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl bg-[#0a0c10] border-2 border-[#17c3b2] p-8 shadow-[10px_10px_0px_rgba(23,195,178,0.2)] relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#d946ef] blur-[100px] opacity-10 pointer-events-none"></div>
        
        <h2 className="text-2xl font-black tracking-tighter text-[color:var(--color-primary)] mb-6 uppercase flex items-center gap-2">
          {title}
        </h2>
        
        <div className="max-h-[40vh] overflow-y-auto mb-8 pr-4 bg-black/40 p-4 border border-[#283347] font-sans scrollbar-thin scrollbar-thumb-[#17c3b2] scrollbar-track-transparent" tabIndex={0} aria-label="Legal agreement text">
          <section className="mb-8">
            <h3 className="text-xs font-bold text-[#d946ef] mb-3 uppercase tracking-[0.2em] border-b border-[#283347] pb-1">
              Statutory Risk Disclosure
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed font-medium">
              {LEGAL_DISCLAIMERS.DIGITAL_ASSET_RISKS}
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xs font-bold text-[#d946ef] mb-3 uppercase tracking-[0.2em] border-b border-[#283347] pb-1">
              Adisory Disclaimer
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed font-medium">
              {LEGAL_DISCLAIMERS.INFORMATIONAL_PURPOSES}
            </p>
          </section>

          <section>
            <h3 className="text-xs font-bold text-[#d946ef] mb-3 uppercase tracking-[0.2em] border-b border-[#283347] pb-1">
              Player Accountability
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed font-medium">
              {LEGAL_DISCLAIMERS.RESPONSIBLE_GAMING}
            </p>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <label className="flex items-start gap-4 cursor-pointer group select-none">
            <div className="relative flex items-center">
              <input 
                type="checkbox" 
                checked={isAccepted}
                onChange={(e) => setIsAccepted(e.target.checked)}
                className="peer mt-1 w-6 h-6 appearance-none border-2 border-[#283347] bg-black checked:bg-[#17c3b2] checked:border-[#17c3b2] transition-all cursor-pointer"
              />
              <svg 
                className="absolute w-4 h-4 mt-1 left-1 pointer-events-none hidden peer-checked:block text-black" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth="4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm text-white font-bold group-hover:text-[#17c3b2] transition-colors leading-snug">
              I acknowledge that TiltCheck is a non-custodial tool. I have read the Digital Asset Risk disclosures and understand that I am solely responsible for my private keys and funds.
            </span>
          </label>

          <button 
            onClick={onAccept}
            disabled={!isAccepted}
            className={`btn w-full py-5 text-lg font-black tracking-[0.15em] uppercase transition-all transform active:scale-95 ${
              isAccepted 
              ? 'bg-[#17c3b2] text-black hover:bg-[#48d5c6] hover:shadow-[6px_6px_0_#d946ef] border-none' 
              : 'bg-[#141922] text-gray-600 border border-[#283347] cursor-not-allowed grayscale'
            }`}
          >
            ACTIVATE AUDIT LAYER
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;
