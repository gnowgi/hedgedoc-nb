/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const AnnotationCategoryEnum = z.enum([
  'nodes',
  'relations',
  'adjectives',
  'adverbs',
  'attributes',
  'quantifiers',
  'modalities',
  'process',
  'conditions',
  'operations',
  'inputOutput',
]);

const NodeBookAnalyzeSchema = z.object({
  text: z.string().min(1).max(10000),
  categories: z.array(AnnotationCategoryEnum).min(1).max(3),
});

export class NodeBookAnalyzeDto extends createZodDto(NodeBookAnalyzeSchema) {}
