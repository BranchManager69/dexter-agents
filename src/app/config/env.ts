export const CONFIG = {
  dexterApiOrigin:
    process.env.NEXT_PUBLIC_DEXTER_API_ORIGIN?.replace(/\/$/, '') ||
    'https://api.dexter.cash',
  mcpToken: process.env.TOKEN_AI_MCP_TOKEN || process.env.HARNESS_MCP_TOKEN || '',
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'http://localhost:3000',
};

export const getDexterApiRoute = (path: string): string => {
  const cleaned = path.startsWith('/') ? path : `/${path}`;
  return `${CONFIG.dexterApiOrigin}${cleaned}`;
};
