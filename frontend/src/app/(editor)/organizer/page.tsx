'use client'

/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { OrganizerContent } from '../../../components/organizer/organizer-content'
import { Redirect } from '../../../components/common/redirect'
import { useApplicationState } from '../../../hooks/common/use-application-state'
import type { NextPage } from 'next'
import { Container } from 'react-bootstrap'

const OrganizerPage: NextPage = () => {
  const userProvider = useApplicationState((state) => state.user?.authProvider)

  if (!userProvider) {
    return <Redirect to={'/login'} />
  }

  return (
    <Container>
      <OrganizerContent />
    </Container>
  )
}

export default OrganizerPage
