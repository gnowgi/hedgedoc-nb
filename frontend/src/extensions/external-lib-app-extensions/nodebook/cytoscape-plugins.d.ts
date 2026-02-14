/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

declare module 'cytoscape-elk' {
  import type cytoscape from 'cytoscape'
  const cytoscapeElk: cytoscape.Ext
  export default cytoscapeElk
}

declare module 'cytoscape-svg' {
  import type cytoscape from 'cytoscape'
  const cytoscapeSvg: cytoscape.Ext
  export default cytoscapeSvg
}
