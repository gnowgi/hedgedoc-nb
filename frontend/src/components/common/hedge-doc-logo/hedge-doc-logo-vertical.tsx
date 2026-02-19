/*
 * SPDX-FileCopyrightText: 2023 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { LogoSize } from './logo-size'
import React from 'react'

interface HedgeDocLogoVerticalProps {
  autoTextColor?: boolean
  size?: LogoSize | number
}

export const HedgeDocLogoVertical: React.FC<HedgeDocLogoVerticalProps> = ({
  size = LogoSize.MEDIUM
}) => {
  return (
    <img
      src='/logo.png'
      alt='nodeBook'
      height={size}
      width={size}
    />
  )
}
