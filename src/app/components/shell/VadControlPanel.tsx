"use client";

import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

import type { VadSettings } from "../../config/vad";
import { VAD_LIMITS } from "../../config/vad";

export type VadControlPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  settings: VadSettings;
  defaults: VadSettings;
  onChange: (settings: VadSettings) => void;
  onReset: () => void;
};

const formatThreshold = (value: number) => value.toFixed(2);
const formatMs = (value: number) => `${value} ms`;

export function VadControlPanel({
  isOpen,
  onClose,
  settings,
  defaults,
  onChange,
  onReset,
}: VadControlPanelProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleUpdate = <Field extends keyof VadSettings>(field: Field, value: VadSettings[Field]) => {
    onChange({ ...settings, [field]: value });
  };

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition"
            aria-hidden="true"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 pb-6"
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.24, 0.7, 0.3, 1.12] }}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="w-full max-w-xl rounded-3xl border border-white/10 bg-neutral-950/90 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-white/5"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-sm uppercase tracking-[0.22em] text-flux/80">
                    Voice Responsiveness
                  </h2>
                  <p className="mt-2 text-sm text-neutral-300">
                    Fine-tune how quickly Dexter listens and hands the mic back. Changes apply instantly for
                    your current browser session.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-neutral-700/60 bg-neutral-900/60 p-2 text-neutral-200 transition hover:border-flux/50 hover:text-flux"
                  aria-label="Close voice controls"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <VSlider
                  id="vad-threshold"
                  label="Sensitivity"
                  description="Higher values make Dexter wait for stronger speech signals before triggering."
                  value={settings.threshold}
                  unit={formatThreshold(settings.threshold)}
                  min={VAD_LIMITS.threshold.min}
                  max={VAD_LIMITS.threshold.max}
                  step={VAD_LIMITS.threshold.step}
                  onChange={(value) => handleUpdate("threshold", value)}
                  type="float"
                />

                <VSlider
                  id="vad-prefix"
                  label="Lead-in padding"
                  description="Buffer captured before your speech to avoid clipping the start of sentences."
                  value={settings.prefixPaddingMs}
                  unit={formatMs(settings.prefixPaddingMs)}
                  min={VAD_LIMITS.prefixPaddingMs.min}
                  max={VAD_LIMITS.prefixPaddingMs.max}
                  step={VAD_LIMITS.prefixPaddingMs.step}
                  onChange={(value) => handleUpdate("prefixPaddingMs", value)}
                />

                <VSlider
                  id="vad-silence"
                  label="Silence timeout"
                  description="How long Dexter waits after you stop before it responds."
                  value={settings.silenceDurationMs}
                  unit={formatMs(settings.silenceDurationMs)}
                  min={VAD_LIMITS.silenceDurationMs.min}
                  max={VAD_LIMITS.silenceDurationMs.max}
                  step={VAD_LIMITS.silenceDurationMs.step}
                  onChange={(value) => handleUpdate("silenceDurationMs", value)}
                />

                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div>
                    <h3 className="font-display text-[11px] uppercase tracking-[0.2em] text-neutral-300">
                      Auto-response
                    </h3>
                    <p className="mt-1 text-xs text-neutral-400">
                      When enabled, Dexter speaks as soon as it detects a finished turn.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdate("autoRespond", !settings.autoRespond)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                      settings.autoRespond
                        ? "bg-flux/80"
                        : "bg-neutral-700/80"
                    }`}
                    role="switch"
                    aria-checked={settings.autoRespond}
                  >
                    <span
                      className={`ml-1 h-5 w-5 transform rounded-full bg-neutral-900 transition ${
                        settings.autoRespond ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 text-xs text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-neutral-300">Defaults stay intact</p>
                  <p className="mt-1">
                    Reset returns to {formatThreshold(defaults.threshold)} / {formatMs(defaults.prefixPaddingMs)} /{" "}
                    {formatMs(defaults.silenceDurationMs)} with auto-response{" "}
                    {defaults.autoRespond ? "on" : "off"}.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    onClick={onReset}
                    className="inline-flex items-center justify-center rounded-full border border-neutral-700/70 px-4 py-2 font-medium text-neutral-200 transition hover:border-flux/50 hover:text-flux"
                  >
                    Reset defaults
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-full bg-flux/80 px-4 py-2 font-medium text-neutral-900 transition hover:bg-flux"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

type SliderProps =
  | {
      id: string;
      label: string;
      description: string;
      value: number;
      unit: string;
      min: number;
      max: number;
      step: number;
      onChange: (value: number) => void;
      type?: "int";
    }
  | {
      id: string;
      label: string;
      description: string;
      value: number;
      unit: string;
      min: number;
      max: number;
      step: number;
      onChange: (value: number) => void;
      type: "float";
    };

function VSlider({
  id,
  label,
  description,
  value,
  unit,
  min,
  max,
  step,
  onChange,
  type,
}: SliderProps) {
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = type === "float" ? parseFloat(event.target.value) : parseInt(event.target.value, 10);
    onChange(Number.isFinite(next) ? next : value);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    const next = type === "float" ? parseFloat(raw) : parseInt(raw, 10);
    if (!Number.isFinite(next)) {
      return;
    }
    onChange(Math.min(max, Math.max(min, next)));
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-[11px] uppercase tracking-[0.2em] text-neutral-300">{label}</h3>
          <p className="mt-1 text-xs text-neutral-400">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            id={`${id}-input`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={type === "float" ? value.toFixed(2) : value}
            onChange={handleInputChange}
            className="w-20 rounded-lg border border-neutral-700/60 bg-neutral-900/80 px-2 py-1 text-right text-xs text-neutral-100 focus:border-flux/60 focus:outline-none"
          />
          <span className="text-xs text-neutral-400">{unit}</span>
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSliderChange}
        className="mt-4 h-1 w-full appearance-none rounded-full bg-neutral-800 accent-flux focus:outline-none"
      />
    </div>
  );
}

export default VadControlPanel;
