/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { CnlAttribute, CnlEdge, MorphData } from './types'

export class MorphRegistry {
  private morphs: Map<string, MorphData> = new Map()
  private nodeMorphs: Map<string, string[]> = new Map()
  private relationMorphs: Map<string, string[]> = new Map()
  private attributeMorphs: Map<string, string[]> = new Map()

  addMorph(morphId: string, nodeId: string, morphName: string, relationIds: string[] = [], attributeIds: string[] = []): void {
    const morphData: MorphData = {
      morphId,
      nodeId,
      morphName,
      relationIds: [...relationIds],
      attributeIds: [...attributeIds]
    }

    this.morphs.set(morphId, morphData)

    if (!this.nodeMorphs.has(nodeId)) {
      this.nodeMorphs.set(nodeId, [])
    }
    this.nodeMorphs.get(nodeId)!.push(morphId)

    for (const relationId of relationIds) {
      if (!this.relationMorphs.has(relationId)) {
        this.relationMorphs.set(relationId, [])
      }
      this.relationMorphs.get(relationId)!.push(morphId)
    }

    for (const attributeId of attributeIds) {
      if (!this.attributeMorphs.has(attributeId)) {
        this.attributeMorphs.set(attributeId, [])
      }
      this.attributeMorphs.get(attributeId)!.push(morphId)
    }
  }

  getMorph(morphId: string): MorphData | null {
    return this.morphs.get(morphId) ?? null
  }

  getNodeMorphs(nodeId: string): MorphData[] {
    const morphIds = this.nodeMorphs.get(nodeId) ?? []
    return morphIds.map((morphId) => this.morphs.get(morphId)).filter((m): m is MorphData => m !== undefined)
  }

  getMorphRelations(morphId: string): string[] {
    const morphData = this.morphs.get(morphId)
    return morphData ? morphData.relationIds : []
  }

  getMorphAttributes(morphId: string): string[] {
    const morphData = this.morphs.get(morphId)
    return morphData ? morphData.attributeIds : []
  }

  getRelationMorphs(relationId: string): string[] {
    return this.relationMorphs.get(relationId) ?? []
  }

  getAttributeMorphs(attributeId: string): string[] {
    return this.attributeMorphs.get(attributeId) ?? []
  }

  filterRelationsForMorph(relations: CnlEdge[], activeMorphIds: string | string[]): CnlEdge[] {
    const morphIds = Array.isArray(activeMorphIds) ? activeMorphIds : [activeMorphIds]
    const allMorphRelations = new Set<string>()

    for (const morphId of morphIds) {
      for (const relId of this.getMorphRelations(morphId)) {
        allMorphRelations.add(relId)
      }
    }

    const seen = new Set<string>()
    return relations.filter((rel) => {
      if (!allMorphRelations.has(rel.id) || seen.has(rel.id)) return false
      seen.add(rel.id)
      return true
    })
  }

  filterAttributesForMorph(attributes: CnlAttribute[], activeMorphIds: string | string[]): CnlAttribute[] {
    const morphIds = Array.isArray(activeMorphIds) ? activeMorphIds : [activeMorphIds]
    const allMorphAttributes = new Set<string>()

    for (const morphId of morphIds) {
      for (const attrId of this.getMorphAttributes(morphId)) {
        allMorphAttributes.add(attrId)
      }
    }

    const seen = new Set<string>()
    return attributes.filter((attr) => {
      if (!allMorphAttributes.has(attr.id) || seen.has(attr.id)) return false
      seen.add(attr.id)
      return true
    })
  }

  clear(): void {
    this.morphs.clear()
    this.nodeMorphs.clear()
    this.relationMorphs.clear()
    this.attributeMorphs.clear()
  }

  getStats(): { totalMorphs: number; totalNodes: number; totalRelations: number; totalAttributes: number } {
    return {
      totalMorphs: this.morphs.size,
      totalNodes: this.nodeMorphs.size,
      totalRelations: this.relationMorphs.size,
      totalAttributes: this.attributeMorphs.size
    }
  }
}
