/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react'

interface AsyncLoadingBoundaryProps {
  loading: boolean
  error?: Error | boolean
  componentName: string
  children: React.ReactNode
}

export const AsyncLoadingBoundary: React.FC<AsyncLoadingBoundaryProps> = ({ loading, error, componentName, children }) => {
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '0.5rem' }}>
        <div
          style={{
            width: '1.5rem',
            height: '1.5rem',
            border: '2px solid #ccc',
            borderTopColor: '#333',
            borderRadius: '50%',
            animation: 'nb-spin 0.6s linear infinite'
          }}
        />
        <span>Loading {componentName}...</span>
        <style>{`@keyframes nb-spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '1rem', color: '#d32f2f', background: '#fdecea', borderRadius: '4px' }}>
        Failed to load {componentName}.{' '}
        {error instanceof Error ? error.message : ''}
      </div>
    )
  }

  return <>{children}</>
}
