/*
 * SPDX-FileCopyrightText: 2023 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { LogoSize } from './logo-size'
import React from 'react'

interface HedgeDocLogoHorizontalGreyProps {
  color: 'dark' | 'light'
  size?: LogoSize | number
  showText?: boolean
  width?: string | number
  className?: string
}

export const HedgeDocLogoHorizontalGrey: React.FC<HedgeDocLogoHorizontalGreyProps> = ({
  size = LogoSize.MEDIUM,
  showText = true,
  className
}) => {
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <img
        src='/logo.png'
        alt='nodeBook'
        height={size}
        width={size}
      />
      {showText && (
        <span style={{ fontSize: `${Math.max(size * 0.4, 12)}px`, fontWeight: 'bold' }}>
          nodeBook
        </span>
      )}
    </span>
  )
}
