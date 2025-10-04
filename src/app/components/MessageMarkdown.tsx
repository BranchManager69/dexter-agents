"use client";

import type {
  AnchorHTMLAttributes,
  DetailedHTMLProps,
  MouseEvent,
  PropsWithChildren,
  ReactNode,
} from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  solanaArtifactsRemarkPlugin,
  type SolanaArtifactType,
} from "@/app/lib/markdown/solanaArtifacts";

const MAX_LINK_LABEL_LENGTH = 48;

type AnchorProps = DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>;

function ensureStringChild(children: ReactNode): string | undefined {
  if (typeof children === "string") {
    return children;
  }
  if (Array.isArray(children) && children.length > 0) {
    const [first] = children;
    if (typeof first === "string") {
      return first;
    }
  }
  return undefined;
}

function shortenLabel(label: string) {
  if (label.length <= MAX_LINK_LABEL_LENGTH) {
    return label;
  }
  const prefix = label.slice(0, Math.ceil(MAX_LINK_LABEL_LENGTH / 2) - 1);
  const suffix = label.slice(-Math.floor(MAX_LINK_LABEL_LENGTH / 2) + 1);
  return `${prefix}…${suffix}`;
}

function SmartLink(props: AnchorProps) {
  const { children, href, ...rest } = props;
  const rawLabel = ensureStringChild(children);
  const displayLabel = rawLabel ? shortenLabel(rawLabel) : children;

  return (
    <a
      {...rest}
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-flux underline decoration-dotted underline-offset-2 transition hover:text-iris focus:outline-none focus:ring-2 focus:ring-flux/40"
    >
      {displayLabel}
    </a>
  );
}

type MessageMarkdownProps = PropsWithChildren<{
  className?: string;
}>;

export function MessageMarkdown({ children, className }: MessageMarkdownProps) {
  const content = typeof children === "string" ? children : "";
  const componentsMap = useMemo(
    () =>
      ({
        a: (props: AnchorProps) => <SmartLink {...props} />,
        solanaArtifact: ({ node }: { node: any }) => (
          <SolanaArtifact value={node?.value} type={node?.data?.artifactType} />
        ),
      }) as Record<string, any>,
    [],
  );

  return (
    <ReactMarkdown
      className={className}
      remarkPlugins={[remarkGfm, solanaArtifactsRemarkPlugin]}
      components={componentsMap}
    >
      {content}
    </ReactMarkdown>
  );
}

function formatArtifactLabel(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function resolveExplorerUrl(value: string, type: SolanaArtifactType | undefined) {
  if (!type) return undefined;
  if (type === "publicKey") {
    return `https://solscan.io/address/${value}`;
  }
  if (type === "signature") {
    return `https://solscan.io/tx/${value}`;
  }
  return undefined;
}

interface SolanaArtifactProps {
  value?: string;
  type?: SolanaArtifactType;
}

function SolanaArtifact({ value, type }: SolanaArtifactProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeValue = typeof value === "string" ? value : "";
  const label = useMemo(() => formatArtifactLabel(safeValue), [safeValue]);
  const explorerUrl = useMemo(() => resolveExplorerUrl(safeValue, type), [safeValue, type]);

  const handleCopy = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (!safeValue) return;
      try {
        await navigator.clipboard.writeText(safeValue);
        setCopied(true);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => setCopied(false), 1400);
      } catch {
        setCopied(false);
      }
    },
    [safeValue],
  );

  const kindLabel = type === "signature" ? "Transaction" : "Address";

  useEffect(() => () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-neutral-900/40 px-2 py-1 font-mono text-xs text-neutral-100">
      <button
        type="button"
        onClick={handleCopy}
        className="text-neutral-300 transition hover:text-flux focus:outline-none focus:ring-1 focus:ring-flux/60"
        title={`Copy ${kindLabel}`}
        aria-label={`Copy ${kindLabel}`}
      >
        {label}
      </button>
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 transition hover:text-flux"
          title="Open in Solscan"
          aria-label="Open in Solscan"
        >
          ↗
        </a>
      )}
      <span
        aria-live="polite"
        className={`text-[10px] uppercase tracking-[0.22em] transition ${copied ? "text-flux" : "text-neutral-500"}`}
      >
        {copied ? "Copied" : kindLabel}
      </span>
    </span>
  );
}

export default MessageMarkdown;
