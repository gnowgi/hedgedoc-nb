/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { HttpMethod, respondToMatchingRequest } from '../../../../handler-utils/respond-to-matching-request'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { CsrfTokenInterface } from '@hedgedoc/commons'

const handler = (req: NextApiRequest, res: NextApiResponse): void => {
  respondToMatchingRequest<CsrfTokenInterface>(HttpMethod.GET, req, res, {
    token: 'mock-csrf-token'
  })
}

export default handler
