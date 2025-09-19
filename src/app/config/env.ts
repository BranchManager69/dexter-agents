export const CONFIG = {
  dexterApiOrigin:
    process.env.NEXT_PUBLIC_DEXTER_API_ORIGIN?.replace(/\/$/, '') ||
    'https://api.dexter.cash',
  mcpToken: process.env.NEXT_PUBLIC_TOKEN_AI_MCP_TOKEN || process.env.TOKEN_AI_MCP_TOKEN || '',
};

export const getDexterApiRoute = (path: string): string => {
  const cleaned = path.startsWith('/') ? path : `/${path}`;
  return `${CONFIG.dexterApiOrigin}${cleaned}`;
};
