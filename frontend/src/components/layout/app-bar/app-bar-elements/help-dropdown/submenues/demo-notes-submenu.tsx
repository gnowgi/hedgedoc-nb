/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { DropdownHeader } from '../dropdown-header'
import { TranslatedDropdownItem } from '../translated-dropdown-item'
import React, { Fragment } from 'react'
import { Book as IconBook, Stars as IconStars } from 'react-bootstrap-icons'

/**
 * Renders the demo notes submenu for the help dropdown.
 */
export const DemoNotesSubmenu: React.FC = () => {
  return (
    <Fragment>
      <DropdownHeader i18nKey={'appbar.help.demoNotes.header'} />
      <TranslatedDropdownItem
        i18nKey={'appbar.help.demoNotes.nodeBook'}
        icon={IconBook}
        href={'/n/nodeBook'}
      />
      <TranslatedDropdownItem
        i18nKey={'appbar.help.demoNotes.features'}
        icon={IconStars}
        href={'/n/features'}
      />
    </Fragment>
  )
}
