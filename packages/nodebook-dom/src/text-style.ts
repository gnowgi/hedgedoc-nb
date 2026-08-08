/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * Map ASCII letters/digits to Unicode sans-serif math variants so styled text
 * survives inside a single Cytoscape canvas label (and PNG export). Mirrors
 * the HedgeDoc React component. Display-only.
 */
export function mathStyle(text: string, variant: 'bold' | 'italic' | 'bolditalic'): string {
  return Array.from(text)
    .map((ch) => {
      const code = ch.codePointAt(0)!
      const upper = code >= 0x41 && code <= 0x5a
      const lower = code >= 0x61 && code <= 0x7a
      const digit = code >= 0x30 && code <= 0x39
      if (variant === 'bold') {
        if (upper) return String.fromCodePoint(0x1d5d4 + code - 0x41)
        if (lower) return String.fromCodePoint(0x1d5ee + code - 0x61)
        if (digit) return String.fromCodePoint(0x1d7ec + code - 0x30)
      } else if (variant === 'italic') {
        if (upper) return String.fromCodePoint(0x1d608 + code - 0x41)
        if (lower) return String.fromCodePoint(0x1d622 + code - 0x61)
      } else {
        if (upper) return String.fromCodePoint(0x1d63c + code - 0x41)
        if (lower) return String.fromCodePoint(0x1d656 + code - 0x61)
      }
      return ch
    })
    .join('')
}

/** Overlay each character with a combining long stroke (negated attributes). */
export function strikeThrough(text: string): string {
  return Array.from(text)
    .map((ch) => ch + '̶')
    .join('')
}
