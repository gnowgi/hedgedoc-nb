/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { HttpMethod, respondToMatchingRequest } from '../../../../../handler-utils/respond-to-matching-request'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { GuestRegistrationResponseInterface } from '@hedgedoc/commons'

const handler = (req: NextApiRequest, res: NextApiResponse): void => {
  res.setHeader('Set-Cookie', ['mock-session=1; Path=/'])
  respondToMatchingRequest<GuestRegistrationResponseInterface>(HttpMethod.POST, req, res, {
    uuid: '00000000-0000-0000-0000-000000000001'
  })
}

export default handler
