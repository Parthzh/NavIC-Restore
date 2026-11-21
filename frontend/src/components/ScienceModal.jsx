import React from 'react';
import { X, ExternalLink, Award, FileText, CheckCircle2 } from 'lucide-react';

export default function ScienceModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none">
      <div className="bg-space-800 border border-space-600 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-space-700/50 hover:bg-space-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-lg bg-navic-orange/20 text-navic-orange border border-navic-orange/30">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">NavIC Restore · Science & Benchmarks</h2>
            <p className="text-xs text-slate-400">Official Indian Space Missions & Peer-Reviewed Methodology</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          {/* ISRO Portals */}
          <div className="p-3.5 rounded-xl bg-space-900/80 border border-space-700">
            <h3 className="font-semibold text-navic-cyan mb-1.5 flex items-center gap-1.5">
              <span>Official Indian Space Data Portals Integrated</span>
            </h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li><strong className="text-white">Bhoonidhi (NRSC):</strong> EOS-04 (RISAT-1A) C-band SAR cloud-penetrating imagery for real-time flood extent & water depth.</li>
              <li><strong className="text-white">Bhuvan (NRSC):</strong> Cartosat-1 Digital Elevation Model (DEM 30m) for valley topographic profile & horizon shadow calculation.</li>
              <li><strong className="text-white">NavIC / IRNSS Constellation:</strong> Indigenous Indian regional satellite navigation constellation ephemeris.</li>
            </ul>
          </div>

          {/* Research Papers */}
          <div className="space-y-2.5">
            <h3 className="font-semibold text-slate-100 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-navic-orange" />
              <span>Peer-Reviewed Benchmarks We Build Upon</span>
            </h3>

            <div className="p-3 rounded-lg bg-space-900/60 border border-space-700/60">
              <div className="font-medium text-white">1. Sai Bhageerath et al. (NRSC/ISRO, Oct 2025 · JWCC)</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                EOS-04 SAR flood mapping (98.8% accuracy, 95.7% recall in 85s).
                <br />
                <span className="text-emerald-400">Our twist:</span> We use the flood mask as a physical exclusion constraint to optimize tethered pseudolite staging on dry ridges.
              </div>
            </div>

            <div className="p-3 rounded-lg bg-space-900/60 border border-space-700/60">
              <div className="font-medium text-white">2. Chimata et al. (NRSC/ISRO, Jul 2025 · NHESS)</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                EOS-04 SAR + HAND + Trend Surface Analysis flood depth (0.805m RMSE).
                <br />
                <span className="text-emerald-400">Our twist:</span> Open-source pipeline classifying flood channels into ambulance-passable (&lt;0.3m) vs. boat-only (&gt;0.5m).
              </div>
            </div>

            <div className="p-3 rounded-lg bg-space-900/60 border border-space-700/60">
              <div className="font-medium text-white">3. IRNSS Pseudolite Augmentation & ISRO Lunar S-Band (2026)</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Proved pseudolite signals lower GDOP.
                <br />
                <span className="text-emerald-400">Our twist:</span> Live degraded 3-4 satellite CelesTrak states + automated flood-aware dry-ridge optimizer.
              </div>
            </div>
          </div>

          {/* Mathematical Equations */}
          <div className="p-3.5 rounded-xl bg-space-900/80 border border-space-700 font-mono text-[11px] space-y-1.5">
            <div className="text-amber-400 font-sans font-semibold">Mathematical Formulation:</div>
            <div>• Linearized Geometry: G = [-u_E, -u_N, -u_U, 1]</div>
            <div>• Mode 02 Augmentation: G_aug = [G ; -u_E_beacon, -u_N_beacon, -u_U_beacon, 1]</div>
            <div>• Mode 03 Altitude Clamp: G_alt = [G ; 0, 0, 1, 0]</div>
            <div>• Cofactor Matrix: Q = (G_ENU^T * G_ENU)^-1</div>
            <div>• Expected 3D Error: σ_pos = PDOP * σ_UERE</div>
          </div>

          {/* Honesty Disclaimer */}
          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-600/40 text-[11px] text-amber-200">
            <strong>Honesty Disclaimer:</strong> Simulated architecture for prototype evaluation. Modeled routes are computational estimates and do not substitute for on-ground hydrological verification; physical pseudolite deployment requires RF licensing and local hardware timing sync.
          </div>
        </div>
      </div>
    </div>
  );
}
