/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { StylesheetJson } from 'cytoscape'

export type NodeBookTheme = 'light' | 'dark'

interface Palette {
  conceptBg: string
  conceptBorder: string
  conceptText: string
  transitionBg: string
  attributeBg: string
  attributeText: string
  edge: string
  edgeText: string
  negated: string
  inferred: string
  inferredText: string
  background: string
}

const PALETTES: Record<NodeBookTheme, Palette> = {
  light: {
    conceptBg: '#e7f1ff',
    conceptBorder: '#4d8fd1',
    conceptText: '#1a3350',
    transitionBg: '#fff3cd',
    attributeBg: '#f1f3f5',
    attributeText: '#495057',
    edge: '#7a95b3',
    edgeText: '#3d5a77',
    negated: '#c0392b',
    inferred: '#7c3aed',
    inferredText: '#4c1d95',
    background: '#ffffff'
  },
  dark: {
    conceptBg: '#1f3a5a',
    conceptBorder: '#5c9ded',
    conceptText: '#dbe9f8',
    transitionBg: '#4d3f14',
    attributeBg: '#2c3238',
    attributeText: '#c2c9d0',
    edge: '#6d8aa8',
    edgeText: '#9fb8d0',
    negated: '#e07060',
    inferred: '#a78bfa',
    inferredText: '#c4b5fd',
    background: '#14181c'
  }
}

const TRANSITION_ROLES = new Set(['transition', 'process', 'function', 'transaction'])

export function backgroundColor(theme: NodeBookTheme): string {
  return PALETTES[theme].background
}

/** Cytoscape stylesheet for a nodeBook graph in the given theme. */
export function buildStylesheet(theme: NodeBookTheme): StylesheetJson {
  const p = PALETTES[theme]
  return [
    {
      selector: 'node[kind = "concept"]',
      style: {
        shape: 'round-rectangle',
        'background-color': p.conceptBg,
        'border-color': p.conceptBorder,
        'border-width': 1.5,
        color: p.conceptText,
        label: 'data(label)',
        'text-wrap': 'wrap',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': 13,
        padding: '10px',
        width: 'label',
        height: 'label'
      }
    },
    ...Array.from(TRANSITION_ROLES).map((role) => ({
      selector: `node[kind = "concept"][role @= "${role}"]`,
      style: {
        shape: 'diamond' as const,
        'background-color': p.transitionBg,
        padding: '16px'
      }
    })),
    {
      selector: 'node[kind = "attribute"]',
      style: {
        shape: 'round-rectangle',
        'background-color': p.attributeBg,
        'border-width': 0,
        color: p.attributeText,
        label: 'data(label)',
        'text-wrap': 'wrap',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': 11,
        padding: '6px',
        width: 'label',
        height: 'label'
      }
    },
    {
      selector: 'edge',
      style: {
        width: 1.5,
        'curve-style': 'bezier',
        'line-color': p.edge,
        'target-arrow-shape': 'triangle',
        'target-arrow-color': p.edge,
        label: 'data(label)',
        color: p.edgeText,
        'font-size': 11,
        'text-rotation': 'autorotate',
        'text-background-color': p.background,
        'text-background-opacity': 0.75,
        'text-background-padding': '2px'
      }
    },
    {
      selector: 'edge[kind = "attribute-edge"]',
      style: {
        'line-style': 'dashed',
        'target-arrow-shape': 'none',
        width: 1
      }
    },
    {
      selector: 'edge[kind = "negated-relation"]',
      style: {
        'line-style': 'dashed',
        'line-color': p.negated,
        'target-arrow-color': p.negated,
        color: p.negated
      }
    },
    {
      // Compound parents in containment view: translucent box, label on top.
      selector: 'node:parent',
      style: {
        shape: 'round-rectangle',
        'background-color': p.conceptBg,
        'background-opacity': 0.25,
        'border-color': p.conceptBorder,
        'border-width': 1.5,
        color: p.conceptText,
        'text-valign': 'top',
        'text-halign': 'center',
        'text-margin-y': -4,
        'font-size': 13,
        padding: '16px'
      }
    },
    {
      selector: 'edge[kind = "inferred-relation"]',
      style: {
        'line-style': 'dashed',
        'line-dash-pattern': [6, 3],
        'line-color': p.inferred,
        'target-arrow-color': p.inferred,
        color: p.inferredText,
        'curve-style': 'unbundled-bezier',
        'control-point-distances': [40],
        'control-point-weights': [0.5],
        opacity: 0.85,
        'font-size': 10,
        width: 1.5
      }
    }
  ]
}
