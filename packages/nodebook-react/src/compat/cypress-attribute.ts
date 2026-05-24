/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export function cypressId(id: string): { 'data-testid': string } {
  return { 'data-testid': id }
}
