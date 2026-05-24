/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { AnnotationCategory, AnalysisResult } from './analyzer-types'

/**
 * Fetches a CSRF token from the HedgeDoc backend.
 */
async function fetchCsrfToken(): Promise<string> {
  const response = await fetch('/api/private/csrf/token', {
    method: 'GET',
    credentials: 'same-origin'
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch CSRF token: ${response.status}`)
  }
  const data = (await response.json()) as { token: string }
  return data.token
}

/**
 * Client-side API caller for the backend LLM text analysis endpoint.
 * Calls POST /api/private/nodebook/analyze with proper CSRF token.
 */
export async function analyzeViaLlm(
  text: string,
  categories: AnnotationCategory[]
): Promise<AnalysisResult> {
  const csrfToken = await fetchCsrfToken()

  const response = await fetch('/api/private/nodebook/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'csrf-token': csrfToken
    },
    credentials: 'same-origin',
    body: JSON.stringify({ text, categories })
  })

  if (!response.ok) {
    throw new Error(`Analysis API returned ${response.status}`)
  }

  return (await response.json()) as AnalysisResult
}

/**
 * Check if the LLM analysis backend is configured and available.
 */
export async function checkLlmStatus(): Promise<boolean> {
  try {
    const response = await fetch('/api/private/nodebook/status', {
      credentials: 'same-origin'
    })
    if (!response.ok) return false
    const data = (await response.json()) as { configured: boolean }
    return data.configured
  } catch {
    return false
  }
}
