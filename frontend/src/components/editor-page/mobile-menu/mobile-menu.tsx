/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import styles from './mobile-menu.module.scss'
import { AliasesSidebarEntry } from '../sidebar/specific-sidebar-entries/aliases-sidebar-entry/aliases-sidebar-entry'
import { DeleteNoteSidebarEntry } from '../sidebar/specific-sidebar-entries/delete-note-sidebar-entry/delete-note-sidebar-entry'
import { ExportSidebarMenu } from '../sidebar/specific-sidebar-entries/export-sidebar-menu/export-sidebar-menu'
import { ImportMenuSidebarMenu } from '../sidebar/specific-sidebar-entries/import-menu-sidebar-menu'
import { MediaBrowserSidebarMenu } from '../sidebar/specific-sidebar-entries/media-browser-sidebar-menu/media-browser-sidebar-menu'
import { NoteInfoSidebarMenu } from '../sidebar/specific-sidebar-entries/note-info-sidebar-menu/note-info-sidebar-menu'
import { PermissionsSidebarEntry } from '../sidebar/specific-sidebar-entries/permissions-sidebar-entry/permissions-sidebar-entry'
import { PinNoteSidebarEntry } from '../sidebar/specific-sidebar-entries/pin-note-sidebar-entry/pin-note-sidebar-entry'
import { RevisionSidebarEntry } from '../sidebar/specific-sidebar-entries/revisions-sidebar-entry/revision-sidebar-entry'
import { ShareNoteSidebarEntry } from '../sidebar/specific-sidebar-entries/share-note-sidebar-entry/share-note-sidebar-entry'
import { UsersOnlineSidebarMenu } from '../sidebar/specific-sidebar-entries/users-online-sidebar-menu/users-online-sidebar-menu'
import { DocumentSidebarMenuSelection } from '../sidebar/types'
import { HelpDropdown } from '../../layout/app-bar/app-bar-elements/help-dropdown/help-dropdown'
import { SettingsButton } from '../../global-dialogs/settings-dialog/settings-button'
import { NewNoteButton } from '../../common/new-note-button/new-note-button'
import { UserElement } from '../../layout/app-bar/app-bar-elements/user-element'
import React, { useCallback, useState } from 'react'
import { Offcanvas } from 'react-bootstrap'
import { useIsOwner } from '../../../hooks/common/use-is-owner'
import { ChangeEditorContentContextProvider } from '../change-content-context/codemirror-reference-context'

export interface MobileMenuProps {
  show: boolean
  onHide: () => void
}

/**
 * Renders an Offcanvas menu for mobile that contains all sidebar entries and navbar items.
 */
export const MobileMenu: React.FC<MobileMenuProps> = ({ show, onHide }) => {
  const [selectedMenu, setSelectedMenu] = useState<DocumentSidebarMenuSelection>(DocumentSidebarMenuSelection.NONE)
  const isOwner = useIsOwner()

  const toggleValue = useCallback(
    (toggleValue: DocumentSidebarMenuSelection): void => {
      const newValue = selectedMenu === toggleValue ? DocumentSidebarMenuSelection.NONE : toggleValue
      setSelectedMenu(newValue)
    },
    [selectedMenu]
  )

  const selectionIsNotNone = selectedMenu !== DocumentSidebarMenuSelection.NONE

  return (
    <Offcanvas show={show} onHide={onHide} placement={'end'}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Menu</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <ChangeEditorContentContextProvider>
          <div className={styles['sidebar-entries']}>
            <UsersOnlineSidebarMenu
              menuId={DocumentSidebarMenuSelection.USERS_ONLINE}
              selectedMenuId={selectedMenu}
              onClick={toggleValue}
            />
            <NoteInfoSidebarMenu
              menuId={DocumentSidebarMenuSelection.NOTE_INFO}
              selectedMenuId={selectedMenu}
              onClick={toggleValue}
            />
            <RevisionSidebarEntry hide={selectionIsNotNone} />
            <PermissionsSidebarEntry hide={selectionIsNotNone} />
            <AliasesSidebarEntry hide={selectionIsNotNone} />
            <MediaBrowserSidebarMenu
              onClick={toggleValue}
              selectedMenuId={selectedMenu}
              menuId={DocumentSidebarMenuSelection.MEDIA_BROWSER}
            />
            <ImportMenuSidebarMenu
              menuId={DocumentSidebarMenuSelection.IMPORT}
              selectedMenuId={selectedMenu}
              onClick={toggleValue}
            />
            <ExportSidebarMenu
              menuId={DocumentSidebarMenuSelection.EXPORT}
              selectedMenuId={selectedMenu}
              onClick={toggleValue}
            />
            <ShareNoteSidebarEntry hide={selectionIsNotNone} />
            {isOwner && <DeleteNoteSidebarEntry hide={selectionIsNotNone} />}
            <PinNoteSidebarEntry hide={selectionIsNotNone} />
          </div>
          <hr />
          <div className={styles['navbar-items']}>
            <HelpDropdown />
            <SettingsButton />
            <NewNoteButton />
            <UserElement />
          </div>
        </ChangeEditorContentContextProvider>
      </Offcanvas.Body>
    </Offcanvas>
  )
}
