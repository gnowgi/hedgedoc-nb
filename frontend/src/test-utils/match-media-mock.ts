/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/*
 * jsdom does not implement window.matchMedia, which is used by useMediaQuery
 * (e.g. via useIsMobile in the editor pane and splitter). Provide a default
 * desktop (non-matching) implementation so components relying on it can render
 * under jest. Individual tests can override window.matchMedia as needed.
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined, // deprecated
    removeListener: () => undefined, // deprecated
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false
  })
})
