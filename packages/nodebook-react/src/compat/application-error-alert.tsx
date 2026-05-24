/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react'

interface ApplicationErrorAlertProps {
  children: React.ReactNode
}

export const ApplicationErrorAlert: React.FC<ApplicationErrorAlertProps> = ({ children }) => {
  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        color: '#842029',
        backgroundColor: '#f8d7da',
        borderRadius: '4px',
        border: '1px solid #f5c2c7',
        fontSize: '0.9rem'
      }}>
      {children}
    </div>
  )
}
