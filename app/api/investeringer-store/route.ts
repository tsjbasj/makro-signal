import { NextResponse } from 'next/server'
import { createClient, type RedisClientType } from 'redis'

/* Single-record JSON store for the investeringer page.
   Uses Vercel Marketplace Redis (Redis Inc.) which exposes REDIS_URL.
   Falls back to { configured: false } when env is missing — frontend
   then runs in localStorage-only mode. */

const KEY = 'investeringer:default'

// Cache the client across warm invocations of the same lambda container.
let clientPromise: Promise<RedisClientType> | null = null

async function getClient(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL
  if (!url) return null
  if (!clientPromise) {
    clientPromise = (async () => {
      const c = createClient({ url })
      c.on('error', () => { /* swallow — handler returns 500 */ })
      await c.connect()
      return c as RedisClientType
    })().catch((err) => {
      // Reset cache so next request can retry
      clientPromise = null
      throw err
    })
  }
  return clientPromise
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const redis = await getClient()
    if (!redis) {
      return NextResponse.json({ configured: false, data: null }, { status: 200 })
    }
    const raw = await redis.get(KEY)
    const data = raw ? JSON.parse(raw) : null
    return NextResponse.json({ configured: true, data }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ configured: true, error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const redis = await getClient()
    if (!redis) {
      return NextResponse.json({ configured: false, ok: false }, { status: 200 })
    }
    const body = await req.json()
    if (body == null || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
    }
    await redis.set(KEY, JSON.stringify(body))
    return NextResponse.json({ configured: true, ok: true }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ configured: true, error: msg }, { status: 500 })
  }
}
