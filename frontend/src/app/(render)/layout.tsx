/*
 * SPDX-FileCopyrightText: 2023 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import '../../../global-styles/index.scss'
import { ApplicationLoader } from '../../components/application-loader/application-loader'
import { BaseUrlContextProvider } from '../../components/common/base-url/base-url-context-provider'
import { FrontendConfigContextProvider } from '../../components/common/frontend-config-context/frontend-config-context-provider'
import { ExpectedOriginBoundary } from '../../components/layout/expected-origin-boundary'
import { StoreProvider } from '../../redux/store-provider'
import { baseUrlFromEnvExtractor } from '../../utils/base-url-from-env-extractor'
import type { Metadata, Viewport } from 'next'
import React from 'react'
import { getConfig } from '../../api/config'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const baseUrls = baseUrlFromEnvExtractor.extractBaseUrls()
  const frontendConfig = await getConfig(baseUrls.renderer)

  return (
    <html lang='en'>
      <head>
        <link color='#b51f08' href='/icons/safari-pinned-tab.svg' rel='mask-icon' />
      </head>
      <body>
        <ExpectedOriginBoundary expectedOrigin={baseUrls.renderer}>
          <BaseUrlContextProvider baseUrls={baseUrls}>
            <FrontendConfigContextProvider config={frontendConfig}>
              <StoreProvider>
                <ApplicationLoader>{children}</ApplicationLoader>
              </StoreProvider>
            </FrontendConfigContextProvider>
          </BaseUrlContextProvider>
        </ExpectedOriginBoundary>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  applicationName: 'HedgeDoc',
  appleWebApp: {
    title: 'HedgeDoc'
  },
  description: 'HedgeDoc - Ideas grow better together',
  title: 'HedgeDoc',
  manifest: '/icons/site.webmanifest'
}

export const viewport: Viewport = {
  themeColor: '#b51f08',
  width: 'device-width',
  initialScale: 1
}
