/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware that proxies /api/* requests to the backend when not in mock mode.
 * This runs before Pages API routes, ensuring the mock stubs in pages/api/
 * don't intercept real backend requests.
 *
 * Note: /realtime (WebSocket) and /uploads, /public are handled via rewrites
 * in next.config.js since middleware can't proxy WebSocket upgrades and those
 * paths have no conflicting pages/api routes.
 */
export function middleware(request: NextRequest): NextResponse | undefined {
  if (process.env.NEXT_PUBLIC_USE_MOCK_API === 'true') {
    return undefined
  }

  const backendUrl = process.env.HD_INTERNAL_API_URL || 'http://localhost:3000'
  const { pathname, search } = request.nextUrl

  return NextResponse.rewrite(new URL(`${pathname}${search}`, backendUrl))
}

export const config = {
  matcher: ['/api/:path*']
}
