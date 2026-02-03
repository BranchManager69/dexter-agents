import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

type MdastNode = {
  type: string;
  value?: string;
  children?: MdastNode[];
  data?: Record<string, any>;
};

type MdastParent = MdastNode & { children: MdastNode[] };

type SolanaArtifactType = "publicKey" | "signature";

const BASE58_PATTERN = /[1-9A-HJ-NP-Za-km-z]{32,88}/g;

function classifyCandidate(candidate: string): SolanaArtifactType | null {
  try {
    // Public keys (accounts, mints) are valid inputs for PublicKey
    const key = new PublicKey(candidate);
    if (key.toBase58() === candidate) {
      return "publicKey";
    }
  } catch {
    // not a public key; try signature detection below
  }

  try {
    const decoded = bs58.decode(candidate);
    if (decoded.length === 64) {
      return "signature";
    }
  } catch {
    return null;
  }

  return null;
}

function createArtifactNode(value: string, artifactType: SolanaArtifactType): MdastNode {
  return {
    type: "solanaArtifact",
    value,
    // Include children for react-markdown compatibility
    // (some versions pass children instead of node.value)
    children: [{ type: "text", value }],
    data: {
      artifactType,
      hProperties: {
        value,
        artifactType,
      },
    },
  };
}

export const solanaArtifactsRemarkPlugin: Plugin<[], MdastParent> = () => (tree) => {
  console.error('[REMARK-SOLANA] ====== PLUGIN CALLED ======');
  visit(tree, "text", (node: MdastNode, index: number | null, parent: MdastParent | null) => {
    if (!parent || typeof node.value !== "string" || index === null) {
      return;
    }

    const matches = [...node.value.matchAll(BASE58_PATTERN)];
    if (matches.length > 0) {
      console.error('[REMARK-SOLANA] FOUND MATCHES:', matches.length, 'in text:', node.value?.slice(0, 80));
    }
    if (matches.length === 0) {
      return;
    }

    const replacement: MdastNode[] = [];
    let lastIndex = 0;

    for (const match of matches) {
      const matchIndex = match.index ?? 0;
      const candidate = match[0];

      if (matchIndex > lastIndex) {
        replacement.push({ type: "text", value: node.value.slice(lastIndex, matchIndex) });
      }

      const artifactType = classifyCandidate(candidate);
      console.log('[solanaArtifactsPlugin] Candidate:', candidate, '| classified as:', artifactType);
      if (artifactType) {
        const artifactNode = createArtifactNode(candidate, artifactType);
        console.log('[solanaArtifactsPlugin] Created artifact node:', artifactNode);
        replacement.push(artifactNode);
      } else {
        replacement.push({ type: "text", value: candidate });
      }

      lastIndex = matchIndex + candidate.length;
    }

    if (lastIndex < node.value.length) {
      replacement.push({ type: "text", value: node.value.slice(lastIndex) });
    }

    parent.children.splice(index, 1, ...replacement);
  });
};

export type { SolanaArtifactType };
