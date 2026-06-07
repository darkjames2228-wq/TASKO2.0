import React from "react";
import { Settings, RefreshCw, Trash2, Sliders, Volume2, Sparkles, AlertCircle } from "lucide-react";

export interface ColorPreset {
  id: string;
  name: string;
  primary: string;   // hex layout
  secondary: string; // hex layout
  previewClass: string; // for circles rendering
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: "volt-yellow",
    name: "Volt Plasma",
    primary: "#e8ff47",
    secondary: "#47ffe8",
    previewClass: "bg-gradient-to-r from-[#e8ff47] to-[#47ffe8]",
  },
  {
    id: "aether-violet",
    name: "Aether Purple",
    primary: "#c87fff",
    secondary: "#ff47b6",
    previewClass: "bg-gradient-to-r from-[#c87fff] to-[#ff47b6]",
  },
  {
    id: "quantum-blue",
    name: "Quantum Teal",
    primary: "#3b82f6",
    secondary: "#00f5d4",
    previewClass: "bg-gradient-to-r from-[#3b82f6] to-[#00f5d4]",
  },
  {
    id: "solar-rust",
    name: "Solar Flare",
    primary: "#ff4d4d",
    secondary: "#ff9f43",
    previewClass: "bg-gradient-to-r from-[#ff4d4d] to-[#ff9f43]",
  },
  {
    id: "neon-cyberpunk",
    name: "Acid Pink",
    primary: "#ff007f",
    secondary: "#7f00ff",
    previewClass: "bg-gradient-to-r from-[#ff007f] to-[#7f00ff]",
  }
];

interface SettingsPanelProps {
  activePresetId: string;
  onSelectPreset: (presetId: string) => void;
  gridEnabled: boolean;
  onToggleGrid: (enabled: boolean) => void;
  animationSpeed: "slower" | "normal" | "static";
  onChangeSpeed: (speed: "slower" | "normal" | "static") => void;
  onClearAll: () => Promise<void>;
  onLoadDemo: () => Promise<void>;
  tasksCount: number;
}

export function SettingsPanel({
  activePresetId,
  onSelectPreset,
  gridEnabled,
  onToggleGrid,
  animationSpeed,
  onChangeSpeed,
  onClearAll,
  onLoadDemo,
  tasksCount,
}: SettingsPanelProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div id="settings-management-wrapper" className="w-full max-w-2xl mx-auto mb-6">
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          id="toggle-settings-ui-btn"
          className="text-xs font-mono uppercase font-semibold text-brand-muted hover:text-brand-neon flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-dark-surface/60 border border-brand-border/60 backdrop-blur-sm cursor-pointer transition-all active:scale-[0.98]"
        >
          <Settings className={`h-3.5 w-3.5 ${isOpen ? "rotate-90 text-brand-neon animate-spin" : ""} transition-transform duration-300`} />
          <span>{isOpen ? "Close configuration" : "App Settings"}</span>
        </button>
      </div>

      {isOpen && (
        <div id="settings-menu-content-card" className="bg-brand-dark-surface/90 border border-brand-border backdrop-blur-md rounded-2xl p-5 shadow-xl animate-slide-down">
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="h-4 w-4 text-brand-cyan" />
            <h3 className="text-sm font-display font-medium text-gray-200">System Preferences</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Color Swatch Selector */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-brand-muted mb-2">
                  Accent Color Prescription
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {COLOR_PRESETS.map((preset) => {
                    const isSelected = preset.id === activePresetId;
                    return (
                      <button
                        key={preset.id}
                        id={`preset-select-btn-${preset.id}`}
                        onClick={() => onSelectPreset(preset.id)}
                        className={`font-mono text-[10px] p-2 flex items-center gap-2 rounded-xl text-left border cursor-pointer transition-all hover:bg-brand-dark-panel ${
                          isSelected
                            ? "border-brand-neon/80 bg-brand-dark-panel/90 text-gray-100"
                            : "border-brand-border text-brand-muted"
                        }`}
                      >
                        <div className={`h-3.5 w-3.5 rounded-full ${preset.previewClass} shrink-0 ring-1 ring-white/10`} />
                        <span className="truncate">{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Backdrop Speed and Aesthetic Option selection */}
            <div className="space-y-4">
              {/* Grid toggle */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-brand-muted mb-2">
                  Aesthetic Overlays
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-300">Digital Lines Matrix</span>
                  <button
                    onClick={() => onToggleGrid(!gridEnabled)}
                    id="toggle-matrix-grid-btn"
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      gridEnabled ? "bg-brand-cyan" : "bg-brand-border"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-brand-dark shadow ring-0 transition duration-200 ease-in-out ${
                        gridEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Drift animation Speed indicator */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-brand-muted mb-2">
                  Atmospheric Fluidity (Drift Speed)
                </label>
                <div className="flex gap-1">
                  {(["normal", "slower", "static"] as const).map((speed) => {
                    const isActive = animationSpeed === speed;
                    return (
                      <button
                        key={speed}
                        id={`drift-speed-btn-${speed}`}
                        onClick={() => onChangeSpeed(speed)}
                        className={`flex-1 text-[10px] font-mono py-1 rounded border capitalize cursor-pointer transition-all ${
                          isActive
                            ? "bg-brand-cyan/20 text-brand-cyan border-brand-cyan/40 font-semibold"
                            : "bg-brand-dark border-brand-border text-brand-muted hover:text-gray-300"
                        }`}
                      >
                        {speed === "static" ? "Freeze" : speed}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Database actions panel */}
          <div className="mt-5 pt-4 border-t border-brand-border/60">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-start gap-1.5 text-brand-muted text-[10px]">
                <AlertCircle className="h-4 w-4 text-brand-cyan shrink-0 mt-0.5" />
                <div className="space-y-0.5 font-mono">
                  <p>Database: local JSON storage synced with Express server.</p>
                  <p className="text-gray-400">Contains <span className="text-brand-cyan font-bold">{tasksCount}</span> operational active files.</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap justify-end">
                {/* Seed Real Workspace Demo */}
                <button
                  onClick={onLoadDemo}
                  id="demo-seed-action-btn"
                  className="bg-brand-cyan/5 hover:bg-brand-cyan/10 border border-brand-cyan/15 hover:border-brand-cyan/40 text-brand-cyan text-xs font-mono font-medium px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                  title="Inject real working environment tasks files"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Seed Real Kit</span>
                </button>

                {/* Clear database absolute */}
                <button
                  onClick={onClearAll}
                  id="clear-db-absolute-btn"
                  className="bg-red-500/5 hover:bg-red-500/10 border border-red-500/15 hover:border-red-500/40 text-red-400 text-xs font-mono font-medium px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                  title="Purge database"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Wipe All Records</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
