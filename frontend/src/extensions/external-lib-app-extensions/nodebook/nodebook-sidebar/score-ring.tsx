/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react'

export interface ScoreRingProps {
  score: number
  size?: number
}

function getScoreColor(score: number): string {
  if (score <= 30) return '#dc3545' // red
  if (score <= 60) return '#ffc107' // amber
  return '#198754' // green
}

export const ScoreRing: React.FC<ScoreRingProps> = ({ score, size = 90 }) => {
  const strokeWidth = 7
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(Math.max(score, 0), 100)
  const offset = circumference - (progress / 100) * circumference
  const color = getScoreColor(score)
  const center = size / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill='none'
        stroke='var(--bs-border-color, #dee2e6)'
        strokeWidth={strokeWidth}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill='none'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
      />
      <text
        x={center}
        y={center}
        textAnchor='middle'
        dominantBaseline='central'
        fill={color}
        fontSize={size * 0.28}
        fontWeight='bold'>
        {score}
      </text>
    </svg>
  )
}
