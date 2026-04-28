import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

/* Single-record store for the investeringer page.
   Falls back to a 503 when Upstash isn't configured — the frontend then
   keeps using localStorage only. Once you connect Upstash via Vercel
   Marketplace and redeploy, server-sync becomes active automatically. */

const KEY = 'investeringer:default'

function getRedis(): Redis | null {
  // Vercel Marketplace (Upstash) injects KV_REST_API_URL/_TOKEN.
  // Native Upstash uses UPSTASH_REDIS_REST_URL/_TOKEN. Accept both.
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ configured: false, data: null }, { status: 200 })
  }
  try {
    const data = await redis.get(KEY)
    return NextResponse.json({ configured: true, data: data ?? null }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ configured: true, error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ configured: false, ok: false }, { status: 200 })
  }
  try {
    const body = await req.json()
    if (body == null || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
    }
    await redis.set(KEY, body)
    return NextResponse.json({ configured: true, ok: true }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ configured: true, error: msg }, { status: 500 })
  }
}
