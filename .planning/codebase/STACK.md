# Technology Stack

**Analysis Date:** 2026-01-28

## Languages

**Primary:**
- TypeScript ^5 - Application code, React components, API routes
- JavaScript (ES Modules) - Scripts and harness utilities (`scripts/*.js`, `scripts/*.mjs`)

**Secondary:**
- SQL - Prisma migrations (`prisma/migrations/`)
- CSS - Global styles and CSS modules (`*.module.css`, `globals.css`)

## Runtime

**Environment:**
- Node.js >=20 (enforced via `engines` in `package.json`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js ^15.5.9 - Full-stack React framework (App Router)
- React ^19.0.0 - UI library
- React DOM ^19.0.0 - DOM rendering

**Styling:**
- Tailwind CSS ^3.4.1 - Utility-first CSS framework
- PostCSS ^8 - CSS processing
- Autoprefixer ^10.4.21 - CSS vendor prefixing

**Animation:**
- Framer Motion ^12.23.22 - React animation library

**Testing/Development:**
- Playwright ^1.55.0 / @playwright/test ^1.55.1 - E2E testing and browser automation
- Ladle ^5.1.0 - Component story development (Storybook alternative)
- ESLint ^9 with eslint-config-next 15.1.4 - Linting

## Key Dependencies

**AI/LLM:**
- `openai` ^4.77.3 - OpenAI API client
- `@openai/agents` ^0.1.3 - OpenAI Agents SDK
- `@openai/agents-realtime` ^0.1.3 - Realtime voice agent support
- `@modelcontextprotocol/sdk` ^1.17.4 - MCP protocol integration
- `gpt-tokenizer` ^3.0.1 - Token counting
- `tiktoken` ^1.0.22 (dev) - OpenAI tokenizer

**Blockchain:**
- `@solana/web3.js` ^1.98.4 - Solana blockchain interaction
- `bs58` ^6.0.0 - Base58 encoding/decoding

**Authentication:**
- `@supabase/supabase-js` ^2.47.0 - Supabase client
- `@supabase/auth-helpers-nextjs` ^0.10.0 - Next.js auth integration
- `@marsidev/react-turnstile` ^1.0.5 - Cloudflare Turnstile CAPTCHA

**Markdown/Content:**
- `react-markdown` ^9.0.3 - Markdown rendering
- `remark-gfm` ^4.0.1 - GitHub Flavored Markdown support
- `unist-util-visit` ^5.0.0 - AST traversal for markdown plugins

**UI Components:**
- `@radix-ui/react-icons` ^1.3.2 - Icon library

**Utilities:**
- `zod` ^3.24.1 - Schema validation
- `uuid` ^11.0.4 - UUID generation
- `dotenv` ^16.4.7 - Environment variable loading
- `yargs` ^17.7.2 - CLI argument parsing
- `chalk` ^5.6.2 - Terminal styling

**Logging:**
- `pino` ^10.1.0 - JSON logger
- `pino-pretty` ^13.1.2 - Pretty-print pino logs

## Build Tools & Bundlers

**Primary Bundler:**
- Next.js built-in webpack (with custom init workaround for Node 22)
- Config: `next.config.ts`
- Workaround script: `scripts/next-webpack-init.cjs` (fixes webpack lazy getter issues)

**Component Development:**
- Vite (via Ladle)
- Config: `ladle.vite.config.mjs`

**TypeScript:**
- Compiler target: ES2017
- Module: ESNext
- Module resolution: Node
- Path alias: `@/*` → `src/*`

**CSS Processing:**
- PostCSS with Tailwind CSS and Autoprefixer
- Config: `postcss.config.js`

## Process Management

**Production:**
- PM2 for process management
- Scripts: `npm run deploy`, `npm run pm2:prod`, `npm run pm2:dev`
- Default ports: 3210 (prod), 3211 (dev)

## Configuration Files

**TypeScript:**
- `tsconfig.json` - Strict mode disabled, incremental builds enabled

**Next.js:**
- `next.config.ts` - API rewrites to `api.dexter.cash`, image remote patterns

**Styling:**
- `tailwind.config.ts` - Custom color palette with CSS variable integration
- `postcss.config.js` - Tailwind + Autoprefixer

**Linting:**
- ESLint 9 flat config with Next.js preset

## Platform Requirements

**Development:**
- Node.js >=20
- npm for package management
- Playwright browsers for harness/testing (`npx playwright install --with-deps`)

**Production:**
- Node.js >=20
- PM2 process manager
- Environment variables for OpenAI, Supabase, MCP endpoints

---

*Stack analysis: 2026-01-28*
