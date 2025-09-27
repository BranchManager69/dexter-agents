import { NextRequest, NextResponse } from 'next/server';

const ENABLE_TRANSCRIPT_LOGS = process.env.ENABLE_TRANSCRIPT_LOGS !== 'false';
const MAX_FIELD_LENGTH = 2000;

const sanitizeText = (value: unknown) => {
  if (typeof value !== 'string') return value;
  if (value.length <= MAX_FIELD_LENGTH) return value;
  return `${value.slice(0, MAX_FIELD_LENGTH)}…`;
};

export async function POST(request: NextRequest) {
  if (!ENABLE_TRANSCRIPT_LOGS) {
    return NextResponse.json({ logged: false }, { status: 202 });
  }

  try {
    const payload = await request.json();
    const entry = {
      ts: typeof payload?.ts === 'string' ? payload.ts : new Date().toISOString(),
      kind: typeof payload?.kind === 'string' ? payload.kind : 'message',
      role: typeof payload?.role === 'string' ? payload.role : undefined,
      itemId: typeof payload?.itemId === 'string' ? payload.itemId : undefined,
      toolId: typeof payload?.toolId === 'string' ? payload.toolId : undefined,
      toolName: typeof payload?.toolName === 'string' ? payload.toolName : undefined,
      text: sanitizeText(payload?.text),
      arguments: payload?.arguments,
      output: payload?.output,
      meta: payload?.meta,
      source: payload?.source || 'dexter-agents-ui',
      remoteIp: request.headers.get('x-forwarded-for') || undefined,
    };

    console.log('[transcript]', JSON.stringify(entry));

    return NextResponse.json({ logged: true });
  } catch (error) {
    console.error('[transcript] failed to log entry', error);
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
}
