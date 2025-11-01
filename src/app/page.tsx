'use client';

export const dynamic = 'force-dynamic';

const baseFont = '"Inter", "Avenir Next", "Helvetica Neue", Arial, sans-serif';

export default function HomePage() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-[#050507] bg-[radial-gradient(circle_at_top,_rgba(255,124,38,0.18),transparent_55%),radial-gradient(circle_at_bottom,_rgba(25,118,210,0.15),transparent_45%)] px-6 py-20"
      style={{ fontFamily: baseFont, color: '#FCEFE2' }}
    >
      <div
        className="max-w-2xl overflow-hidden rounded-[34px] border border-white/15 bg-white/6 shadow-[0_28px_120px_rgba(22,22,35,0.45)] backdrop-blur-2xl"
        style={{ color: '#FCEFE2' }}
      >
        <div className="relative grid gap-10 px-12 py-14 text-left sm:grid-cols-[minmax(0,1fr)] sm:text-left">
          <div className="absolute inset-x-0 -top-24 mx-auto h-48 w-48 rounded-full bg-gradient-to-br from-[#FFB478] via-[#FF8D4D] to-[#FF6500] opacity-40 blur-[110px]" />
          <div className="relative space-y-6">
            <div
              className="inline-flex items-center gap-3 rounded-full border border-[#FFB478]/60 bg-[#2B1A12]/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.4em]"
              style={{ color: '#FFD7B0' }}
            >
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#FF8D4D] shadow-[0_0_0_4px_rgba(255,141,77,0.25)] animate-pulse" />
              Scheduled upgrade
            </div>

            <h1
              className="text-3xl font-semibold leading-tight sm:text-[38px] sm:leading-[1.05]"
              style={{
                backgroundImage: 'linear-gradient(135deg, #FFE8D0, #FFD0A1, #FF8D4D)',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Dexter Voice is in maintenance mode
            </h1>

            <p className="text-base leading-relaxed" style={{ color: '#F8E4D3' }}>
              We’re deploying realtime harness upgrades, hardening MCP tool orchestration, and rotating shared session
              credentials. Live trading, guest demos, and transcript exports are paused until the window closes.
            </p>

            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4" style={{ color: '#FCEFE2' }}>
                <p className="text-xs uppercase tracking-[0.25em]" style={{ color: '#FFB478' }}>
                  Ops Feed
                </p>
                <p className="mt-2 leading-relaxed">
                  Status snapshots post to <span className="font-semibold text-white">@dexter</span> and&nbsp;
                  <code className="rounded-md bg-[#321F13]/80 px-1.5 py-0.5 text-xs" style={{ color: '#FFDDBA' }}>
                    #ops-dexter
                  </code>
                  .
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4" style={{ color: '#E7F4FF' }}>
                <p className="text-xs uppercase tracking-[0.25em]" style={{ color: '#6ECFF6' }}>
                  Harness Crew
                </p>
                <p className="mt-2 leading-relaxed">
                  Operators receive Slack + email prompts once sessions are cleared to reconnect.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center">
              <a
                href="https://status.dexter.cash"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#FF9C59] via-[#FF7A2D] to-[#FF6500] px-8 py-2.5 text-sm font-semibold text-[#2D1204] shadow-[0_18px_45px_rgba(255,124,46,0.35)] transition hover:brightness-110"
              >
                View status dashboard
              </a>
              <a
                href="mailto:support@dexter.cash"
                className="inline-flex items-center justify-center rounded-full border border-white/25 px-7 py-2.5 text-sm font-semibold transition hover:border-white/45"
                style={{ color: '#FFE8D0' }}
              >
                support@dexter.cash
              </a>
            </div>
          </div>
        </div>

        <div
          className="border-t border-white/10 bg-[#120D18]/70 px-10 py-5 text-center text-[11px] uppercase tracking-[0.45em]"
          style={{ color: '#A989FF' }}
        >
          Thank you for your patience while we recalibrate
        </div>
      </div>
    </main>
  );
}
