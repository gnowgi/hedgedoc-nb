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
  { name: 'Transaction', description: 'An accounting transaction that moves value between accounts (double-entry).', parent_types: ['class'] },
  { name: 'Account', description: 'A general ledger account that holds monetary value.', parent_types: ['class'] },
  { name: 'Asset', description: 'An account representing resources owned (debit-normal).', parent_types: ['Account'] },
  { name: 'Liability', description: 'An account representing obligations owed (credit-normal).', parent_types: ['Account'] },
  { name: 'Equity', description: 'An account representing owner\'s residual interest (credit-normal).', parent_types: ['Account'] },
  { name: 'Revenue', description: 'An account representing income earned (credit-normal).', parent_types: ['Account'] },
  { name: 'Expense', description: 'An account representing costs incurred (debit-normal).', parent_types: ['Account'] },
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
  { name: 'duality', description: 'Connects reciprocal events (e.g., a sale and a payment).', symmetric: true, domain: ['Event'], range: ['Event'] },
  { name: 'stockflow', description: 'Connects an economic event to the resource it affects.', domain: ['Event'], range: ['Resource'] },
  { name: 'is_a', inverse_name: 'has_subtype', description: 'Subsumption between two types/classes (e.g., "Human is a Mammal").', domain: ['class'], range: ['class'], symmetric: false, transitive: true, aliases: ['is a'] },
  { name: 'member_of', inverse_name: 'has_member', description: 'An individual belongs to a class (e.g., "Socrates is a member of Humans").', domain: ['individual'], range: ['class'], symmetric: false, transitive: false, aliases: ['member of'] },
  { name: 'instance_of', inverse_name: 'has_instance', description: 'An individual is an instance of a class (e.g., "Earth is an instance of Planet").', domain: ['individual'], range: ['class'], symmetric: false, transitive: false, aliases: ['instance of'] },
  { name: 'part_of', inverse_name: 'has_part', symmetric: false, transitive: true, description: 'Indicates that one entity is a part of another entity', domain: [], range: [] },
  { name: 'is a type of', description: 'Indicates that a class is a subtype of another class.', inverse_name: 'is a parent type of', transitive: true, domain: ['class'], range: ['class'] },
  { name: 'has prior_state', description: 'Defines the inputs and conditions for a transition.', domain: ['Transition'], range: [] },
  { name: 'has post_state', description: 'Defines the outputs of a transition.', domain: ['Transition'], range: [] },
  { name: 'debit', description: 'Debits an account (increases assets/expenses, decreases liabilities/equity/revenue).', domain: ['Transaction'], range: ['Account', 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] },
  { name: 'credit', description: 'Credits an account (decreases assets/expenses, increases liabilities/equity/revenue).', domain: ['Transaction'], range: ['Account', 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] },
  { name: 'has operand', description: 'Links a LogicalOperator to one of its operands.', domain: ['LogicalOperator'], range: [] }
]

export const attributeTypes: AttributeTypeSchema[] = [
  { name: 'charge', data_type: 'float', description: 'Measures electric charge. Example: An electron has a charge of -1.602e-19 C.', domain: ['Electron', 'Ion'], unit: 'coulomb (C)', allowed_values: null },
  { name: 'energy', data_type: 'float', description: 'Quantifies the capacity to do work. Example: A battery stores electrical energy.', domain: ['Particle', 'Field', 'Reaction'], unit: 'joule (J)', allowed_values: null },
  { name: 'mass', data_type: 'float', description: 'Measures the amount of matter in an object. Example: Earth\'s mass is ~5.97e24 kg.', domain: ['Particle', 'Planet', 'Organism'], unit: 'kilogram (kg)', allowed_values: null },
  { name: 'population', data_type: 'number', description: 'Number of inhabitants', domain: ['City', 'Region', 'Country'], unit: null, allowed_values: null },
  { name: 'temperature', data_type: 'float', description: 'Indicates thermal energy level. Example: Water boils at 373.15 K.', domain: ['Gas', 'Liquid', 'Solid'], unit: 'kelvin (K)', allowed_values: null },
  { name: 'velocity', data_type: 'float', description: 'Describes the rate of change of position. Example: A car moving at 60 km/h.', domain: ['Particle', 'Vehicle'], unit: 'meters per second (m/s)', allowed_values: null },
  { name: 'area', data_type: 'float', description: 'Any place will have an attribute \'area\'', domain: ['Place'], unit: null, allowed_values: null },
  { name: 'Alternate name', data_type: 'string', description: 'Any thing that is called by another name', unit: null, domain: [], allowed_values: null },
  { name: 'name', data_type: 'string', description: 'The primary name or title of an entity', unit: null, domain: [], allowed_values: null },
  { name: 'description', data_type: 'string', description: 'A detailed description or explanation of an entity', unit: null, domain: [], allowed_values: null },
  { name: 'identifier', data_type: 'string', description: 'A unique identifier or code for an entity', unit: null, domain: [], allowed_values: null },
  { name: 'url', data_type: 'string', description: 'A web address or link associated with an entity', unit: null, domain: [], allowed_values: null },
  { name: 'email', data_type: 'string', description: 'An email address associated with a person or organization', unit: null, domain: ['Person', 'Organization'], allowed_values: null },
  { name: 'phone', data_type: 'string', description: 'A phone number associated with a person or organization', unit: null, domain: ['Person', 'Organization'], allowed_values: null },
  { name: 'birth_date', data_type: 'date', description: 'The date when a person was born', unit: null, domain: ['Person'], allowed_values: null },
  { name: 'death_date', data_type: 'date', description: 'The date when a person died', unit: null, domain: ['Person'], allowed_values: null },
  { name: 'founded_date', data_type: 'date', description: 'The date when an organization was established', unit: null, domain: ['Organization'], allowed_values: null },
  { name: 'start_date', data_type: 'date', description: 'The beginning date of an event or period', unit: null, domain: ['Event'], allowed_values: null },
  { name: 'end_date', data_type: 'date', description: 'The ending date of an event or period', unit: null, domain: ['Event'], allowed_values: null },
  { name: 'created_date', data_type: 'date', description: 'The date when an entity was created', unit: null, domain: [], allowed_values: null },
  { name: 'modified_date', data_type: 'date', description: 'The date when an entity was last modified', unit: null, domain: [], allowed_values: null },
  { name: 'latitude', data_type: 'float', description: 'Geographic latitude coordinate', unit: 'degrees', domain: ['Place', 'Location'], allowed_values: null },
  { name: 'longitude', data_type: 'float', description: 'Geographic longitude coordinate', unit: 'degrees', domain: ['Place', 'Location'], allowed_values: null },
  { name: 'elevation', data_type: 'float', description: 'Height above sea level', unit: 'meters', domain: ['Place', 'Location'], allowed_values: null },
  { name: 'width', data_type: 'float', description: 'The width dimension of an object', unit: 'meters', domain: ['Object'], allowed_values: null },
  { name: 'height', data_type: 'float', description: 'The height dimension of an object', unit: 'meters', domain: ['Object'], allowed_values: null },
  { name: 'depth', data_type: 'float', description: 'The depth dimension of an object', unit: 'meters', domain: ['Object'], allowed_values: null },
  { name: 'weight', data_type: 'float', description: 'The weight of an object', unit: 'kilograms', domain: ['Object'], allowed_values: null },
  { name: 'color', data_type: 'string', description: 'The color of an object', unit: null, domain: ['Object'], allowed_values: null },
  { name: 'material', data_type: 'string', description: 'The material an object is made of', unit: null, domain: ['Object'], allowed_values: null },
  { name: 'status', data_type: 'string', description: 'The current status or state of an entity', unit: null, domain: [], allowed_values: ['active', 'inactive', 'pending', 'completed', 'cancelled'] },
  { name: 'type', data_type: 'string', description: 'The type or category of an entity', unit: null, domain: [], allowed_values: null },
  { name: 'category', data_type: 'string', description: 'A category or classification of an entity', unit: null, domain: [], allowed_values: null },
  { name: 'tag', data_type: 'string', description: 'A tag or label associated with an entity', unit: null, domain: [], allowed_values: null },
  { name: 'language', data_type: 'string', description: 'The language of a document or communication', unit: null, domain: ['Document'], allowed_values: null },
  { name: 'format', data_type: 'string', description: 'The format of a document or file', unit: null, domain: ['Document'], allowed_values: null },
  { name: 'size', data_type: 'number', description: 'The size of a file or document in bytes', unit: 'bytes', domain: ['Document'], allowed_values: null },
  { name: 'version', data_type: 'string', description: 'The version number of an entity', unit: null, domain: [], allowed_values: null },
  { name: 'author', data_type: 'string', description: 'The author or creator of a document or work', unit: null, domain: ['Document'], allowed_values: null },
  { name: 'publisher', data_type: 'string', description: 'The publisher of a document or work', unit: null, domain: ['Document'], allowed_values: null },
  { name: 'isbn', data_type: 'string', description: 'International Standard Book Number', unit: null, domain: ['Document'], allowed_values: null },
  { name: 'issn', data_type: 'string', description: 'International Standard Serial Number', unit: null, domain: ['Document'], allowed_values: null },
  { name: 'price', data_type: 'float', description: 'The price or cost of an item', unit: 'currency', domain: ['Object'], allowed_values: null },
  { name: 'currency', data_type: 'string', description: 'The currency used for a price or monetary value', unit: null, domain: [], allowed_values: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR'] },
  { name: 'rating', data_type: 'float', description: 'A numerical rating or score', unit: null, domain: [], allowed_values: null },
  { name: 'score', data_type: 'float', description: 'A numerical score or grade', unit: null, domain: [], allowed_values: null },
  { name: 'count', data_type: 'number', description: 'A count or quantity of items', unit: null, domain: [], allowed_values: null },
  { name: 'percentage', data_type: 'float', description: 'A percentage value', unit: 'percent', domain: [], allowed_values: null },
  { name: 'frequency', data_type: 'float', description: 'The frequency of occurrence or repetition', unit: 'hertz (Hz)', domain: [], allowed_values: null },
  { name: 'duration', data_type: 'float', description: 'The duration or length of time', unit: 'seconds', domain: ['Event'], allowed_values: null },
  { name: 'distance', data_type: 'float', description: 'The distance between two points', unit: 'meters', domain: [], allowed_values: null },
  { name: 'volume', data_type: 'float', description: 'The volume of an object or container', unit: 'cubic meters', domain: ['Object'], allowed_values: null },
  { name: 'density', data_type: 'float', description: 'The density of a material', unit: 'kg/m^3', domain: ['Object'], allowed_values: null },
  { name: 'number of protons', description: 'Attribute type used in the graph', data_type: 'string', unit: null, domain: [], allowed_values: null },
  { name: 'number of neutrons', description: 'Attribute type used in the graph', data_type: 'string', unit: null, domain: [], allowed_values: null },
  { name: 'number of electrons', description: 'Attribute type used in the graph', data_type: 'string', unit: null, domain: [], allowed_values: null },
  {
    name: 'position', data_type: 'complex', complex_type: 'position',
    description: 'A 3D position coordinates as a single data type. Example: A car at position (25.0, 15.0, 0.0) meters.',
    domain: ['Object', 'Particle', 'Vehicle'], unit: 'meters (m)', allowed_values: null,
    structure: {
      x: { type: 'float', unit: 'meters (m)', description: 'X-coordinate' },
      y: { type: 'float', unit: 'meters (m)', description: 'Y-coordinate' },
      z: { type: 'float', unit: 'meters (m)', description: 'Z-coordinate' }
    }
  },
  {
    name: 'time', data_type: 'complex', complex_type: 'time',
    description: 'Time as a complex data type. Example: time: (5.0, "seconds")',
    domain: ['Object', 'Particle', 'Vehicle'], unit: 'seconds (s)', allowed_values: null,
    structure: {
      value: { type: 'float', unit: 'seconds (s)', description: 'Time value' },
      unit: { type: 'string', unit: null, description: 'Time unit (seconds, minutes, hours)' }
    }
  },
  {
    name: 'gps', data_type: 'complex', complex_type: 'gps',
    description: 'GPS coordinates as a complex data type. Example: gps: (37.7749, -122.4194, 100.0, "2024-01-01T12:00:00Z")',
    domain: ['Vehicle', 'Drone', 'Satellite'], unit: 'degrees, meters', allowed_values: null,
    structure: {
      lat: { type: 'float', unit: 'degrees', description: 'Latitude coordinate' },
      long: { type: 'float', unit: 'degrees', description: 'Longitude coordinate' },
      alt: { type: 'float', unit: 'meters (m)', description: 'Altitude above sea level' },
      timestamp: { type: 'datetime', unit: null, description: 'GPS timestamp' }
    }
  }
]

export const transitionTypes: TransitionTypeSchema[] = [
  { name: 'transform', description: 'Transform one entity into another', inputs: ['individual'], outputs: ['individual'] },
  { name: 'create', description: 'Create a new entity', inputs: [], outputs: ['individual'] }
]

export const functionTypes: FunctionTypeSchema[] = [
  {
    name: 'atomicMass',
    expression: '"number of protons" + "number of neutrons"',
    scope: ['Element', 'class']
  },
  {
    name: 'distance',
    expression: 'let $x_1$ be "position x"; let $y_1$ be "position y"; let $z_1$ be "position z"; let $x_2$ be "previous position x"; let $y_2$ be "previous position y"; let $z_2$ be "previous position z"; let delta_x be $x_1$ - $x_2$; let delta_y be $y_1$ - $y_2$; let delta_z be $z_1$ - $z_2$; sqrt(power(delta_x, 2) + power(delta_y, 2) + power(delta_z, 2))',
    scope: ['Object', 'Particle', 'Vehicle', 'class'],
    description: 'Calculates Euclidean distance between two 3D positions using vector notation',
    required_attributes: ['position x', 'position y', 'position z', 'previous position x', 'previous position y', 'previous position z']
  },
  {
    name: 'displacement',
    expression: 'let $x$ be "position x"; let $y$ be "position y"; let $z$ be "position z"; let $x_0$ be "initial position x"; let $y_0$ be "initial position y"; let $z_0$ be "initial position z"; let delta_x be $x$ - $x_0$; let delta_y be $y$ - $y_0$; let delta_z be $z$ - $z_0$; sqrt(power(delta_x, 2) + power(delta_y, 2) + power(delta_z, 2))',
    scope: ['Object', 'Particle', 'Vehicle', 'class'],
    description: 'Calculates displacement from initial position to current position using vector notation',
    required_attributes: ['position x', 'position y', 'position z', 'initial position x', 'initial position y', 'initial position z']
  },
  {
    name: 'speed',
    expression: 'let $x_1$ be "position x"; let $y_1$ be "position y"; let $z_1$ be "position z"; let $x_2$ be "previous position x"; let $y_2$ be "previous position y"; let $z_2$ be "previous position z"; let $t_1$ be "time"; let $t_2$ be "previous time"; let delta_x be $x_1$ - $x_2$; let delta_y be $y_1$ - $y_2$; let delta_z be $z_1$ - $z_2$; let distance be sqrt(power(delta_x, 2) + power(delta_y, 2) + power(delta_z, 2)); let delta_t be $t_1$ - $t_2$; distance / delta_t',
    scope: ['Object', 'Particle', 'Vehicle', 'class'],
    description: 'Calculates speed (distance traveled over time) using intermediate variables',
    required_attributes: ['position x', 'position y', 'position z', 'previous position x', 'previous position y', 'previous position z', 'time', 'previous time']
  },
  {
    name: 'velocity_magnitude',
    expression: 'let $x$ be "position x"; let $y$ be "position y"; let $z$ be "position z"; let $x_0$ be "initial position x"; let $y_0$ be "initial position y"; let $z_0$ be "initial position z"; let $t_1$ be "time"; let $t_2$ be "previous time"; let delta_x be $x$ - $x_0$; let delta_y be $y$ - $y_0$; let delta_z be $z$ - $z_0$; let displacement be sqrt(power(delta_x, 2) + power(delta_y, 2) + power(delta_z, 2)); let delta_t be $t_1$ - $t_2$; displacement / delta_t',
    scope: ['Object', 'Particle', 'Vehicle', 'class'],
    description: 'Calculates velocity magnitude (displacement over time) using intermediate variables',
    required_attributes: ['position x', 'position y', 'position z', 'initial position x', 'initial position y', 'initial position z', 'time', 'previous time']
  },
  {
    name: 'acceleration',
    expression: 'let $x_1$ be "position x"; let $y_1$ be "position y"; let $z_1$ be "position z"; let $x_2$ be "previous position x"; let $y_2$ be "previous position y"; let $z_2$ be "previous position z"; let $x_3$ be "previous previous position x"; let $y_3$ be "previous previous position y"; let $z_3$ be "previous previous position z"; let $t_1$ be "time"; let $t_2$ be "previous time"; let $t_3$ be "previous previous time"; let velocity_1 be sqrt(power($x_1$ - $x_2$, 2) + power($y_1$ - $y_2$, 2) + power($z_1$ - $z_2$, 2)) / ($t_1$ - $t_2$); let velocity_2 be sqrt(power($x_2$ - $x_3$, 2) + power($y_2$ - $y_3$, 2) + power($z_2$ - $z_3$, 2)) / ($t_2$ - $t_3$); let delta_v be velocity_1 - velocity_2; let delta_t be $t_1$ - $t_2$; delta_v / delta_t',
    scope: ['Object', 'Particle', 'Vehicle', 'class'],
    description: 'Calculates acceleration (change in velocity over time) using intermediate variables',
    required_attributes: ['position x', 'position y', 'position z', 'previous position x', 'previous position y', 'previous position z', 'previous previous position x', 'previous previous position y', 'previous previous position z', 'time', 'previous time', 'previous previous time']
  }
]
