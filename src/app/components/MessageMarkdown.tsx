"use client";

import type {
  AnchorHTMLAttributes,
  DetailedHTMLProps,
  PropsWithChildren,
  ReactNode,
} from "react";
import { useMemo, Fragment } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseSolanaArtifacts } from "@/app/lib/markdown/solanaArtifacts";
import SolanaArtifactBadge from "./solana/SolanaArtifactBadge";

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

/**
 * Recursively process React children to find and replace Solana addresses with badges.
 */
function processChildrenForSolanaArtifacts(children: ReactNode): ReactNode {
  if (typeof children === "string") {
    const segments = parseSolanaArtifacts(children);
    if (segments.length === 1 && segments[0].type === "text") {
      return children; // No artifacts found, return as-is
    }
    return (
      <>
        {segments.map((seg, i) =>
          seg.type === "artifact" && seg.artifactType ? (
            <SolanaArtifactBadge key={i} value={seg.value} type={seg.artifactType} />
          ) : (
            <Fragment key={i}>{seg.value}</Fragment>
          )
        )}
      </>
    );
  }

  if (Array.isArray(children)) {
    return children.map((child, i) => (
      <Fragment key={i}>{processChildrenForSolanaArtifacts(child)}</Fragment>
    ));
  }

  // For React elements, we can't easily modify their children without cloning
  // Return as-is for non-string children
  return children;
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
        // Process paragraph text to find Solana addresses
        p: ({ children, ...rest }: any) => (
          <p {...rest}>{processChildrenForSolanaArtifacts(children)}</p>
        ),
        // Process list items too
        li: ({ children, ...rest }: any) => (
          <li {...rest}>{processChildrenForSolanaArtifacts(children)}</li>
        ),
        // Process inline code that might contain addresses
        code: ({ children, ...rest }: any) => {
          const processed = processChildrenForSolanaArtifacts(children);
          // If we found an artifact, don't wrap in code
          if (processed !== children) {
            return <>{processed}</>;
          }
          return <code {...rest}>{children}</code>;
        },
      }) as Record<string, any>,
    [],
  );

  return (
    <ReactMarkdown
      className={className}
      remarkPlugins={[remarkGfm]}
      components={componentsMap}
    >
      {content}
    </ReactMarkdown>
  );
}
export default MessageMarkdown;
