/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { isMockMode } from '../../../../../utils/test-modes'

const handler = (req: NextApiRequest, res: NextApiResponse): void => {
  if (!isMockMode) {
    res.status(404).send('Mock API is disabled')
    return
  }
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed')
    return
  }
  res.setHeader('Set-Cookie', ['mock-session=1; Path=/'])
  res.status(200).json({})
}

export default handler
