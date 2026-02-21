/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback } from 'react'
import { FormControl, InputGroup } from 'react-bootstrap'
import { X } from 'react-bootstrap-icons'
import { UiIcon } from '../common/icons/ui-icon'
import { useOnInputChange } from '../../hooks/common/use-on-input-change'
import { useTranslatedText } from '../../hooks/common/use-translated-text'
import styles from './organizer-content.module.scss'

export interface OrganizerSearchProps {
  searchFilter: string
  setSearchFilter: React.Dispatch<React.SetStateAction<string>>
}

export const OrganizerSearch: React.FC<OrganizerSearchProps> = ({ searchFilter, setSearchFilter }) => {
  const placeholderText = useTranslatedText('organizer.search')
  const onChange = useOnInputChange(setSearchFilter)
  const clearSearch = useCallback(() => {
    setSearchFilter('')
  }, [setSearchFilter])

  return (
    <InputGroup className='mb-3'>
      <FormControl placeholder={placeholderText} aria-label={placeholderText} onChange={onChange} value={searchFilter} />
      <button className={styles.innerBtn} onClick={clearSearch}>
        <UiIcon icon={X} />
      </button>
    </InputGroup>
  )
}
