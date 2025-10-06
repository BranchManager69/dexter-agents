import React from "react";

import type { ToolNoteRenderer } from "./types";
import {
  BASE_CARD_CLASS,
  SECTION_TITLE_CLASS,
  HashBadge,
  normalizeOutput,
  unwrapStructured,
  formatSolDisplay,
  formatUsd,
} from "./helpers";

function formatPercent(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return `${numeric.toFixed(2)}%`;
}

function pick<T = string>(...candidates: Array<T | null | undefined>): T | undefined {
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined) {
      return candidate as T;
    }
  }
  return undefined;
}

function renderInfoRows(rows: Array<{ label: string; value: React.ReactNode }>) {
  if (!rows.length) return null;
  return (
    <div className="space-y-2">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs uppercase tracking-[0.24em] text-[#F0BFA1]">{label}</span>
          <span className="text-[#FFF6EC]">{value}</span>
        </div>
      ))}
    </div>
  );
}

function renderRoute(route: unknown): React.ReactNode {
  if (!route) return null;
  if (Array.isArray(route)) {
    return (
      <div className="space-y-2 text-sm text-[#FFE4CF]">
        <div className="text-xs uppercase tracking-[0.24em] text-[#F0BFA1]">Route</div>
        <ol className="space-y-2">
          {route.map((leg: any, index: number) => {
            const label = leg?.label || leg?.pool || `Leg ${index + 1}`;
            const inputMint = pick<string>(leg?.inputMint, leg?.inMint);
            const outputMint = pick<string>(leg?.outputMint, leg?.outMint);
            const provider = leg?.provider || leg?.source;
            return (
              <li key={index} className="rounded-md border border-[#F7BE8A]/18 bg-[#1A090D]/70 p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#F9D9C3]">
                  <span>{label}</span>
                  {provider && <span className="text-[#FFE4CF]/80">· {provider}</span>}
                </div>
                <div className="mt-2 space-y-1 text-xs">
                  {inputMint && (
                    <div className="flex items-center gap-2">
                      <span className="text-[#F0BFA1]">From</span>
                      <HashBadge value={inputMint} href={`https://solscan.io/token/${inputMint}`} ariaLabel="Input mint" />
                    </div>
                  )}
                  {outputMint && (
                    <div className="flex items-center gap-2">
                      <span className="text-[#F0BFA1]">To</span>
                      <HashBadge value={outputMint} href={`https://solscan.io/token/${outputMint}`} ariaLabel="Output mint" />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  if (typeof route === "string") {
    return (
      <div className="text-sm text-[#FFE4CF]">
        <div className="text-xs uppercase tracking-[0.24em] text-[#F0BFA1]">Route</div>
        <div className="mt-1 whitespace-pre-wrap break-words">{route}</div>
      </div>
    );
  }

  return null;
}

function computeSummary(renderLabel: string, item: any, structured: any, args: any) {
  const infoRows: Array<{ label: string; value: React.ReactNode }> = [];

  const fromMint = pick<string>(structured?.inputMint, structured?.sourceMint, args?.from_mint, args?.input_mint);
  const toMint = pick<string>(structured?.outputMint, structured?.destinationMint, args?.to_mint, args?.output_mint);
  const amountIn = pick(structured?.inputAmount, structured?.amountIn, args?.amount_in, args?.amountIn);
  const amountOut = pick(structured?.outputAmount, structured?.amountOut, structured?.expectedOutput, structured?.expected_out, structured?.quote);
  const amountInLamports = pick(structured?.inputAmountLamports, structured?.amountInLamports, args?.amount_in_lamports);
  const amountOutLamports = pick(structured?.outputAmountLamports, structured?.amountOutLamports, structured?.expected_output_lamports);
  const priceImpact = pick(structured?.priceImpactPercent, structured?.priceImpact, structured?.price_impact_percent, structured?.price_impact);
  const usdIn = pick(structured?.inputUsdValue, structured?.usdIn, structured?.usd_in);
  const usdOut = pick(structured?.outputUsdValue, structured?.usdOut, structured?.usd_out);
  const feeLamports = pick(structured?.feesLamports, structured?.platformFeeLamports, structured?.totalFeesLamports);

  if (fromMint) {
    infoRows.push({
      label: "From",
      value: (
        <span className="flex items-center gap-2">
          {amountIn && <span>{String(amountIn)}</span>}
          {amountInLamports && !amountIn && formatSolDisplay(amountInLamports, { fromLamports: true }) && (
            <span>{formatSolDisplay(amountInLamports, { fromLamports: true })}</span>
          )}
          <HashBadge value={fromMint} href={`https://solscan.io/token/${fromMint}`} ariaLabel="From mint" />
        </span>
      ),
    });
  }

  if (toMint) {
    infoRows.push({
      label: "To",
      value: (
        <span className="flex items-center gap-2">
          {amountOut && <span>{String(amountOut)}</span>}
          {amountOutLamports && !amountOut && formatSolDisplay(amountOutLamports, { fromLamports: true }) && (
            <span>{formatSolDisplay(amountOutLamports, { fromLamports: true })}</span>
          )}
          <HashBadge value={toMint} href={`https://solscan.io/token/${toMint}`} ariaLabel="To mint" />
        </span>
      ),
    });
  }

  if (usdIn) {
    infoRows.push({ label: "Input USD", value: formatUsd(usdIn) ?? String(usdIn) });
  }

  if (usdOut) {
    infoRows.push({ label: "Output USD", value: formatUsd(usdOut) ?? String(usdOut) });
  }

  if (priceImpact) {
    infoRows.push({ label: "Price impact", value: formatPercent(priceImpact) ?? String(priceImpact) });
  }

  if (feeLamports) {
    const display = formatSolDisplay(feeLamports, { fromLamports: true }) ?? String(feeLamports);
    infoRows.push({ label: "Platform fees", value: display });
  }

  const slippage = pick(structured?.slippageBps, structured?.slippage_bps, args?.slippage_bps);
  if (slippage) {
    const bps = typeof slippage === "number" ? slippage : Number(slippage);
    const percent = Number.isFinite(bps) ? `${(bps / 100).toFixed(2)}%` : String(slippage);
    infoRows.push({ label: "Slippage", value: percent });
  }

  const route = structured?.route ?? structured?.legs;
  const warnings = Array.isArray(structured?.warnings)
    ? structured.warnings.filter((warn: unknown): warn is string => typeof warn === "string" && warn.length > 0)
    : [];

  return {
    header: (
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className={SECTION_TITLE_CLASS}>{renderLabel}</div>
          <div className="mt-2 text-xs text-[#F9D9C3]">{item.timestamp}</div>
        </div>
      </div>
    ),
    info: renderInfoRows(infoRows),
    route: renderRoute(route),
    warnings: warnings.length ? (
      <div className="space-y-2 rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
        <div className="text-xs uppercase tracking-[0.24em] text-amber-200">Warnings</div>
        <ul className="space-y-1">
          {warnings.map((warn, index) => (
            <li key={index}>{warn}</li>
          ))}
        </ul>
      </div>
    ) : null,
    raw: structured,
    args,
  };
}

export const solanaSwapPreviewRenderer: ToolNoteRenderer = ({ item, debug = false, isExpanded, onToggle }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, any> | undefined) || {};
  const structured = unwrapStructured(rawOutput);
  const args = (item.data as any)?.arguments ?? {};

  const { header, info, route, warnings } = computeSummary("Swap Preview", item, structured, args);

  const quoteSource = pick(structured?.quoteSource, structured?.provider, structured?.routeSource);
  const previewInfo: Array<{ label: string; value: React.ReactNode }> = [];
  if (quoteSource) {
    previewInfo.push({ label: "Quote source", value: quoteSource });
  }
  const estimatedTime = pick(structured?.estimatedSeconds, structured?.ETASeconds, structured?.eta_seconds);
  if (estimatedTime) {
    const seconds = typeof estimatedTime === "number" ? estimatedTime : Number(estimatedTime);
    const label = Number.isFinite(seconds) ? `${seconds.toFixed(0)}s` : String(estimatedTime);
    previewInfo.push({ label: "ETA", value: label });
  }

  return (
    <div className={BASE_CARD_CLASS}>
      {header}
      <div className="space-y-4">
        {info}
        {previewInfo.length ? renderInfoRows(previewInfo) : null}
        {route}
        {warnings}
        {debug && (
          <details className="rounded-md border border-[#F7BE8A]/18 bg-[#1A090D]/70 p-3 text-sm text-[#FFEBD7]">
            <summary className="cursor-pointer text-[10px] uppercase tracking-[0.22em] text-[#F0BFA1]">
              Raw preview data
            </summary>
            <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-xs text-[#FFF6EC]">
              {JSON.stringify(rawOutput, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export const solanaSwapExecuteRenderer: ToolNoteRenderer = ({ item, debug = false, isExpanded, onToggle }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, any> | undefined) || {};
  const structured = unwrapStructured(rawOutput);
  const args = (item.data as any)?.arguments ?? {};

  const { header, info, route, warnings } = computeSummary("Swap Execution", item, structured, args);

  const signature = pick<string>(structured?.signature, structured?.txSignature, structured?.signatureId, structured?.transaction);
  const solscanUrl = signature ? `https://solscan.io/tx/${signature}` : undefined;
  const status = pick<string>(structured?.status, rawOutput?.status);
  const slot = pick<string | number>(structured?.slot, rawOutput?.slot);

  const extraRows: Array<{ label: string; value: React.ReactNode }> = [];
  if (status) {
    extraRows.push({ label: "Status", value: status });
  }
  if (slot) {
    extraRows.push({ label: "Slot", value: String(slot) });
  }
  if (signature) {
    extraRows.push({
      label: "Signature",
      value: <HashBadge value={signature} href={solscanUrl} ariaLabel="Transaction signature" />,
    });
  }

  const errorMessage = pick<string>(rawOutput?.errorMessage, rawOutput?.error, structured?.error);

  return (
    <div className={BASE_CARD_CLASS}>
      {header}
      <div className="space-y-4">
        {info}
        {extraRows.length ? renderInfoRows(extraRows) : null}
        {route}
        {warnings}
        {errorMessage && (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-100">
            {errorMessage}
          </div>
        )}
        {debug && (
          <details className="rounded-md border border-[#F7BE8A]/18 bg-[#1A090D]/70 p-3 text-sm text-[#FFEBD7]">
            <summary className="cursor-pointer text-[10px] uppercase tracking-[0.22em] text-[#F0BFA1]">
              Raw execution data
            </summary>
            <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-xs text-[#FFF6EC]">
              {JSON.stringify(rawOutput, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

