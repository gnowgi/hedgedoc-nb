/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import useMediaQuery from '@restart/hooks/useMediaQuery'

export const useIsMobile = (): boolean => useMediaQuery('(max-width: 767.98px)')
