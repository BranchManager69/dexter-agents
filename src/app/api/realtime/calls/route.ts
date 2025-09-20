import { NextRequest } from 'next/server';

import { MODEL_IDS } from '../../../config/models';

const OPENAI_REALTIME_URL = `https://api.openai.com/v1/realtime/calls?model=${MODEL_IDS.realtime}`;

const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-OpenAI-Agents-SDK',
];

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': ALLOWED_HEADERS.join(','),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'missing_authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();

    const upstreamResponse = await fetch(OPENAI_REALTIME_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        Authorization: authHeader,
        'OpenAI-Beta': 'realtime=v1',
        'X-OpenAI-Agents-SDK': req.headers.get('x-openai-agents-sdk') ?? '',
        Accept: 'application/sdp',
      },
      body,
    });

    const responseBody = await upstreamResponse.text();
    const headers = new Headers({
      'Content-Type': upstreamResponse.headers.get('content-type') || 'application/sdp',
      'Access-Control-Allow-Origin': '*',
    });
    const location = upstreamResponse.headers.get('location');
    if (location) headers.set('Location', location);

    return new Response(responseBody, {
      status: upstreamResponse.status,
      headers,
    });
  } catch (error) {
    console.error('Error proxying realtime call:', error);
    return new Response(JSON.stringify({ error: 'proxy_failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
