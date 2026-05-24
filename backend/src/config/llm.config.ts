/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { registerAs } from '@nestjs/config';
import z from 'zod';

const schema = z.object({
  // NLP microservice (spaCy + Qwen2.5) — preferred
  nlpServiceUrl: z.string().url().or(z.null()).describe('HD_NLP_SERVICE_URL'),
  // LLM API (Anthropic / OpenAI compatible) — fallback
  apiUrl: z.string().url().or(z.null()).describe('HD_LLM_API_URL'),
  apiKey: z.string().min(1).or(z.null()).describe('HD_LLM_API_KEY'),
  model: z.string().min(1).describe('HD_LLM_MODEL'),
});

export type LlmConfig = z.infer<typeof schema>;

export default registerAs('llmConfig', () => {
  const llmConfig = schema.safeParse({
    nlpServiceUrl: process.env.HD_NLP_SERVICE_URL ?? null,
    apiUrl: process.env.HD_LLM_API_URL ?? null,
    apiKey: process.env.HD_LLM_API_KEY ?? null,
    model: process.env.HD_LLM_MODEL ?? 'claude-sonnet-4-20250514',
  });
  if (llmConfig.error) {
    console.warn(
      'LLM/NLP configuration incomplete. Text analysis will be unavailable.',
      llmConfig.error.errors.map((e) => e.message).join(', '),
    );
    return {
      nlpServiceUrl: null,
      apiUrl: null,
      apiKey: null,
      model: 'claude-sonnet-4-20250514',
    } satisfies LlmConfig;
  }
  return llmConfig.data;
});
