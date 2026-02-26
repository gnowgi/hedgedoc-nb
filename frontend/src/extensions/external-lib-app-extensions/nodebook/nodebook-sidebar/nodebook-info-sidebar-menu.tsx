/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { SidebarButton } from '../../../../components/editor-page/sidebar/sidebar-button/sidebar-button'
import { SidebarMenu } from '../../../../components/editor-page/sidebar/sidebar-menu/sidebar-menu'
import { SidebarMenuInfoEntry } from '../../../../components/editor-page/sidebar/sidebar-menu-info-entry/sidebar-menu-info-entry'
import type { SpecificSidebarMenuProps } from '../../../../components/editor-page/sidebar/types'
import { DocumentSidebarMenuSelection } from '../../../../components/editor-page/sidebar/types'
import buttonStyles from '../../../../components/editor-page/sidebar/sidebar-button/sidebar-button.module.scss'
import { concatCssClasses } from '../../../../utils/concat-css-classes'
import { useNodeBookStats } from './use-nodebook-stats'
import { ScoreRing } from './score-ring'
import styles from './nodebook-info-sidebar.module.scss'
import React, { Fragment, useCallback } from 'react'
import {
  ArrowLeft as IconArrowLeft,
  Diagram3 as IconDiagram,
  HddNetwork as IconNodes,
  ArrowLeftRight as IconEdges,
  Tags as IconAttributes,
  Activity as IconInferred,
  QuestionCircle as IconQueries,
  Layers as IconMorphs,
  FileEarmarkCode as IconBlocks
} from 'react-bootstrap-icons'
import { Trans, useTranslation } from 'react-i18next'

function getBarColor(earned: number, max: number): string {
  const pct = max > 0 ? earned / max : 0
  if (pct <= 0.33) return '#dc3545'
  if (pct <= 0.66) return '#ffc107'
  return '#198754'
}

export const NodeBookInfoSidebarMenu: React.FC<SpecificSidebarMenuProps> = ({
  className,
  menuId,
  onClick,
  selectedMenuId
}) => {
  useTranslation()

  const { hasNodeBookBlocks, stats, score } = useNodeBookStats()

  const hide = selectedMenuId !== DocumentSidebarMenuSelection.NONE && selectedMenuId !== menuId
  const expand = selectedMenuId === menuId
  const onClickHandler = useCallback(() => {
    onClick(menuId)
  }, [menuId, onClick])

  if (!hasNodeBookBlocks) {
    return null
  }

  return (
    <Fragment>
      <SidebarButton
        hide={hide}
        icon={expand ? IconArrowLeft : IconDiagram}
        className={concatCssClasses(className, { [buttonStyles.main]: expand })}
        onClick={onClickHandler}>
        <Trans i18nKey={'editor.nodeBookInfo.title'} />
      </SidebarButton>
      <SidebarMenu expand={expand}>
        {/* Score ring */}
        <div className={styles['score-header']}>
          <ScoreRing score={score.total} />
          <span className={styles['score-label']}>
            <Trans i18nKey={'editor.nodeBookInfo.score'} />
          </span>
        </div>

        {/* Category breakdown */}
        <div className={styles.categories}>
          {score.categories.map((cat) => (
            <div key={cat.name} className={styles['category-row']}>
              <span className={styles['category-name']}>
                <Trans i18nKey={`editor.nodeBookInfo.categories.${cat.name}`} />
              </span>
              <span className={styles['category-score']}>
                {cat.earned}/{cat.max}
              </span>
              <div className={styles['category-bar-track']}>
                <div
                  className={styles['category-bar-fill']}
                  style={{
                    width: `${cat.max > 0 ? (cat.earned / cat.max) * 100 : 0}%`,
                    backgroundColor: getBarColor(cat.earned, cat.max)
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className={styles.divider} />

        {/* Stats */}
        <SidebarMenuInfoEntry titleI18nKey={'editor.nodeBookInfo.stats.nodes'} icon={IconNodes}>
          <span>{stats.nodeCount}</span>
        </SidebarMenuInfoEntry>
        <SidebarMenuInfoEntry titleI18nKey={'editor.nodeBookInfo.stats.edges'} icon={IconEdges}>
          <span>{stats.edgeCount}</span>
        </SidebarMenuInfoEntry>
        <SidebarMenuInfoEntry titleI18nKey={'editor.nodeBookInfo.stats.attributes'} icon={IconAttributes}>
          <span>{stats.attributeCount}</span>
        </SidebarMenuInfoEntry>
        <SidebarMenuInfoEntry titleI18nKey={'editor.nodeBookInfo.stats.inferred'} icon={IconInferred}>
          <span>{stats.inferredEdgeCount}</span>
        </SidebarMenuInfoEntry>
        <SidebarMenuInfoEntry titleI18nKey={'editor.nodeBookInfo.stats.queries'} icon={IconQueries}>
          <span>{stats.queryCount}</span>
        </SidebarMenuInfoEntry>
        <SidebarMenuInfoEntry titleI18nKey={'editor.nodeBookInfo.stats.morphs'} icon={IconMorphs}>
          <span>{stats.morphCount}</span>
        </SidebarMenuInfoEntry>
        <SidebarMenuInfoEntry titleI18nKey={'editor.nodeBookInfo.stats.blocks'} icon={IconBlocks}>
          <span>{stats.blockCount}</span>
        </SidebarMenuInfoEntry>
      </SidebarMenu>
    </Fragment>
  )
}
