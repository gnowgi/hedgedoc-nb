/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { AttributeTypeSchema, FunctionTypeSchema, NodeTypeSchema, RelationTypeSchema, TransitionTypeSchema } from './types'

export const nodeTypes: NodeTypeSchema[] = [
  { name: 'class', description: 'A class or category of entities', parent_types: [] },
  { name: 'individual', description: 'A specific instance of a class', parent_types: [] },
  { name: 'Resource', description: 'Goods, services, or money that have economic value.', parent_types: ['class'] },
  { name: 'Event', description: 'An economic event that changes the quantity of a resource.', parent_types: ['class'] },
  { name: 'Agent', description: 'A person or company who participates in an economic event.', parent_types: ['class'] },
  { name: 'LogicalOperator', description: 'A node representing a logical condition like AND or OR.', parent_types: ['class'] },
  { name: 'Substance', description: 'A material with definite chemical composition.', parent_types: ['class'] },
  { name: 'Element', description: 'A pure substance consisting of one type of atom.', parent_types: ['Substance'] },
  { name: 'Molecule', description: 'A group of atoms bonded together.', parent_types: ['Substance'] },
  { name: 'Transition', description: 'A process that transforms inputs to outputs.', parent_types: ['class'] },
  { name: 'Person', description: 'A human being', parent_types: ['Agent'] },
  { name: 'Organization', description: 'A group of people organized for a purpose', parent_types: ['Agent'] },
  { name: 'Place', description: 'A physical location or geographical area', parent_types: ['individual'] },
  { name: 'Concept', description: 'An abstract idea or mental construct', parent_types: ['individual'] },
  { name: 'Object', description: 'A physical thing or artifact', parent_types: ['individual'] }
]

export const relationTypes: RelationTypeSchema[] = [
  { name: 'inflow', description: 'An event increases a resource.', domain: ['Event'], range: ['Resource'] },
  { name: 'outflow', description: 'An event decreases a resource.', domain: ['Event'], range: ['Resource'] },
  { name: 'provides', description: 'An agent provides resources to an event.', domain: ['Agent'], range: ['Event'] },
  { name: 'receives', description: 'An agent receives resources from an event.', domain: ['Agent'], range: ['Event'] },
  { name: 'duality', description: 'Connects reciprocal events.', symmetric: true, domain: ['Event'], range: ['Event'] },
  { name: 'stockflow', description: 'Connects an economic event to the resource it affects.', domain: ['Event'], range: ['Resource'] },
  { name: 'is_a', inverse_name: 'has_subtype', description: 'Indicates that a node is an instance of a class.', domain: ['individual'], range: ['class'], symmetric: false, transitive: true, aliases: ['is a', 'instance of'] },
  { name: 'part_of', inverse_name: 'has_part', symmetric: false, transitive: true, description: 'Indicates that one entity is a part of another entity', domain: [], range: [] },
  { name: 'is a type of', description: 'Indicates that a class is a subtype of another class.', inverse_name: 'is a parent type of', transitive: true, domain: ['class'], range: ['class'] },
  { name: 'has prior_state', description: 'Defines the inputs and conditions for a transition.', domain: ['Transition'], range: [] },
  { name: 'has post_state', description: 'Defines the outputs of a transition.', domain: ['Transition'], range: [] },
  { name: 'has operand', description: 'Links a LogicalOperator to one of its operands.', domain: ['LogicalOperator'], range: [] }
]

export const attributeTypes: AttributeTypeSchema[] = [
  { name: 'charge', data_type: 'float', description: 'Measures electric charge.', domain: ['Electron', 'Ion'], unit: 'coulomb (C)', allowed_values: null },
  { name: 'energy', data_type: 'float', description: 'Quantifies the capacity to do work.', domain: ['Particle', 'Field', 'Reaction'], unit: 'joule (J)', allowed_values: null },
  { name: 'mass', data_type: 'float', description: 'Measures the amount of matter in an object.', domain: ['Particle', 'Planet', 'Organism'], unit: 'kilogram (kg)', allowed_values: null },
  { name: 'population', data_type: 'number', description: 'Number of inhabitants', domain: ['City', 'Region', 'Country'], unit: null, allowed_values: null },
  { name: 'temperature', data_type: 'float', description: 'Indicates thermal energy level.', domain: ['Gas', 'Liquid', 'Solid'], unit: 'kelvin (K)', allowed_values: null },
  { name: 'velocity', data_type: 'float', description: 'Describes the rate of change of position.', domain: ['Particle', 'Vehicle'], unit: 'meters per second (m/s)', allowed_values: null },
  { name: 'area', data_type: 'float', description: 'Any place will have an attribute area', domain: ['Place'], unit: null, allowed_values: null },
  { name: 'Alternate name', data_type: 'string', description: 'Any thing that is called by another name', unit: null, domain: [], allowed_values: null },
  { name: 'name', data_type: 'string', description: 'The primary name or title of an entity', unit: null, domain: [], allowed_values: null },
  { name: 'description', data_type: 'string', description: 'A detailed description or explanation', unit: null, domain: [], allowed_values: null },
  { name: 'identifier', data_type: 'string', description: 'A unique identifier or code', unit: null, domain: [], allowed_values: null },
  { name: 'url', data_type: 'string', description: 'A web address or link', unit: null, domain: [], allowed_values: null },
  { name: 'email', data_type: 'string', description: 'An email address', unit: null, domain: ['Person', 'Organization'], allowed_values: null },
  { name: 'phone', data_type: 'string', description: 'A phone number', unit: null, domain: ['Person', 'Organization'], allowed_values: null },
  { name: 'number of protons', description: 'Attribute type used in the graph', data_type: 'string', unit: null, domain: [], allowed_values: null },
  { name: 'number of neutrons', description: 'Attribute type used in the graph', data_type: 'string', unit: null, domain: [], allowed_values: null },
  { name: 'number of electrons', description: 'Attribute type used in the graph', data_type: 'string', unit: null, domain: [], allowed_values: null }
]

export const transitionTypes: TransitionTypeSchema[] = [
  { name: 'transform', description: 'Transform one entity into another', inputs: ['individual'], outputs: ['individual'] },
  { name: 'create', description: 'Create a new entity', inputs: [], outputs: ['individual'] }
]

export const functionTypes: FunctionTypeSchema[] = [
  { name: 'atomicMass', expression: '"number of protons" + "number of neutrons"', scope: ['Element', 'class'] },
  { name: 'distance', expression: 'sqrt(power(delta_x, 2) + power(delta_y, 2) + power(delta_z, 2))', scope: ['Object', 'Particle', 'Vehicle', 'class'], description: 'Calculates Euclidean distance between two 3D positions' },
  { name: 'speed', expression: 'distance / delta_t', scope: ['Object', 'Particle', 'Vehicle', 'class'], description: 'Calculates speed (distance traveled over time)' },
  { name: 'acceleration', expression: 'delta_v / delta_t', scope: ['Object', 'Particle', 'Vehicle', 'class'], description: 'Calculates acceleration (change in velocity over time)' }
]
