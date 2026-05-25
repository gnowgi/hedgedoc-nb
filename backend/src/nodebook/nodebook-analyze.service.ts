/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Inject, Injectable } from '@nestjs/common';
import fetch from 'node-fetch';

import llmConfig, { type LlmConfig } from '../config/llm.config';
import { ConsoleLoggerService } from '../logger/console-logger.service';

export interface TextSpan {
  start: number;
  end: number;
  text: string;
  category: string;
  confidence: number;
  cnlHint?: string;
  nodeClassification?: 'class' | 'individual' | 'transition' | 'attribute-candidate';
  suggestedNodeType?: string;
  suggestedRelation?: string;
  processParticipants?: string[];
  cnlLines?: string[];
  relationKind?: 'verb' | 'preposition';
}

export interface AnalysisResult {
  spans: TextSpan[];
  sentenceBoundaries: number[];
  source: 'nlp-service' | 'nlp-service-full' | 'llm';
  debug?: {
    endpoint?: string;
    rawResponse: string;
    model?: string;
    systemPrompt?: string;
    userMessage?: string;
    elapsedSeconds?: number;
  };
}

// Categories that require the full LLM pipeline (/extract)
const SEMANTIC_CATEGORIES = new Set([
  'process',
  'attributes',
  'conditions',
  'operations',
  'inputOutput',
]);

/** Curated set of nominalized processes common in science textbooks.
 *  These are nouns that represent processes/transitions, not static concepts. */
const NOMINALIZED_PROCESSES = new Set([
  // Biology
  'photosynthesis',
  'respiration',
  'fermentation',
  'digestion',
  'metabolism',
  'mitosis',
  'meiosis',
  'transcription',
  'translation',
  'replication',
  'mutation',
  'evolution',
  'adaptation',
  'selection',
  'speciation',
  'germination',
  'pollination',
  'fertilization',
  'gestation',
  'metamorphosis',
  'osmosis',
  'diffusion',
  'endocytosis',
  'exocytosis',
  'phagocytosis',
  'glycolysis',
  'gluconeogenesis',
  'biosynthesis',
  'catabolism',
  'anabolism',
  // Chemistry
  'oxidation',
  'reduction',
  'combustion',
  'hydrolysis',
  'polymerization',
  'crystallization',
  'ionization',
  'electrolysis',
  'neutralization',
  'precipitation',
  'distillation',
  'sublimation',
  'titration',
  'decomposition',
  'synthesis',
  'substitution',
  'elimination',
  'addition',
  'isomerization',
  'catalysis',
  'corrosion',
  'dissolution',
  // Physics
  'evaporation',
  'condensation',
  'convection',
  'conduction',
  'radiation',
  'reflection',
  'refraction',
  'diffraction',
  'interference',
  'polarization',
  'absorption',
  'emission',
  'fission',
  'fusion',
  'decay',
  'acceleration',
  'deceleration',
  'collision',
  'oscillation',
  'vibration',
  'propagation',
  'amplification',
  'attenuation',
  'resonance',
  'induction',
  // Earth science
  'erosion',
  'weathering',
  'sedimentation',
  'subduction',
  'volcanism',
  'earthquake',
  'glaciation',
  'fossilization',
  // General
  'transformation',
  'conversion',
  'production',
  'consumption',
  'transmission',
  'computation',
  'migration',
  'circulation',
  'regulation',
  'signaling',
]);

/** Maps NER labels to CNL node types */
const NER_TYPE_MAP: Record<string, string> = {
  PERSON: 'Person',
  ORG: 'Organization',
  GPE: 'Place',
  LOC: 'Place',
  PRODUCT: 'Object',
  EVENT: 'Event',
  WORK_OF_ART: 'Object',
  NORP: 'class', // Nationalities, religious, political groups
  FAC: 'Place', // Facilities
  QUANTITY: 'class',
  DATE: 'class',
  TIME: 'class',
};

/** Response shape from the NLP microservice */
interface NlpServiceResponse {
  input_text: string;
  common_nouns: string[];
  proper_nouns: string[];
  named_entities: Array<{ text: string; label: string }>;
  adjectives: string[];
  adverbs: string[];
  quantifiers: string[];
  qualifiers: string[];
  processes: Array<{
    process: string;
    participants: string[];
    description: string;
  }>;
  attributes: Array<{
    entity: string;
    attributes: string[];
  }>;
  semantic_relations: Array<{
    type: string;
    from: string;
    to: string;
    description: string;
  }>;
  qualifiers_context: Array<{
    phrase: string;
    role: string;
    modifies: string;
  }>;
  dependency_relations: Array<{
    governor: string;
    dependent: string;
    relation: string;
  }>;
  elapsed_seconds: number;
}

@Injectable()
export class NodeBookAnalyzeService {
  constructor(
    private readonly logger: ConsoleLoggerService,
    @Inject(llmConfig.KEY)
    private readonly config: LlmConfig,
  ) {
    this.logger.setContext(NodeBookAnalyzeService.name);
  }

  isConfigured(): boolean {
    return (
      this.config.nlpServiceUrl !== null ||
      (this.config.apiUrl !== null && this.config.apiKey !== null)
    );
  }

  getStatus(): { configured: boolean; nlpService: boolean; llmApi: boolean } {
    return {
      configured: this.isConfigured(),
      nlpService: this.config.nlpServiceUrl !== null,
      llmApi: this.config.apiUrl !== null && this.config.apiKey !== null,
    };
  }

  async analyze(text: string, categories: string[]): Promise<AnalysisResult> {
    // Prefer NLP microservice if configured
    if (this.config.nlpServiceUrl) {
      return await this.analyzeViaNlpService(text, categories);
    }

    // Fall back to LLM API
    if (this.config.apiUrl && this.config.apiKey) {
      return await this.analyzeViaLlmApi(text, categories);
    }

    throw new Error('No analysis service configured');
  }

  // ─── NLP Microservice (spaCy + Qwen2.5) ────────────────────────

  private async analyzeViaNlpService(text: string, categories: string[]): Promise<AnalysisResult> {
    const needsFull = categories.some((c) => SEMANTIC_CATEGORIES.has(c));
    const endpoint = needsFull ? '/extract' : '/extract/fast';
    const url = `${this.config.nlpServiceUrl}${endpoint}`;

    this.logger.log(`Calling NLP service: ${endpoint} (categories: ${categories.join(', ')})`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`NLP service error: ${response.status} ${errorBody}`);
      throw new Error(`NLP service returned ${response.status}`);
    }

    const data = (await response.json()) as NlpServiceResponse;
    this.logger.log(`NLP service responded in ${data.elapsed_seconds}s`);

    const spans = this.mapNlpResponseToSpans(text, data, categories);

    // Simple sentence boundary detection
    const sentenceBoundaries: number[] = [0];
    const sentenceRegex = /[.!?]\s+/g;
    let match: RegExpExecArray | null;
    while ((match = sentenceRegex.exec(text)) !== null) {
      sentenceBoundaries.push(match.index + match[0].length);
    }

    return {
      spans,
      sentenceBoundaries,
      source: needsFull ? 'nlp-service-full' : 'nlp-service',
      debug: {
        endpoint: url,
        rawResponse: JSON.stringify(data, null, 2),
        elapsedSeconds: data.elapsed_seconds,
      },
    };
  }

  /**
   * Maps NLP microservice response fields to our TextSpan format.
   * Finds character offsets by searching for each word/phrase in the original text.
   */
  private mapNlpResponseToSpans(
    text: string,
    data: NlpServiceResponse,
    categories: string[],
  ): TextSpan[] {
    const spans: TextSpan[] = [];
    const catSet = new Set(categories);

    // Nodes: common_nouns + proper_nouns + named_entities
    // With semantic classification: class / individual / transition
    if (catSet.has('nodes')) {
      // Build process noun set from NLP processes field (if available from /extract)
      const processNounSet = new Set<string>();
      for (const proc of data.processes) {
        processNounSet.add(proc.process.toLowerCase());
      }
      // Build NER lookup: text → label
      const nerLabelMap = new Map<string, string>();
      for (const ent of data.named_entities) {
        nerLabelMap.set(ent.text.toLowerCase(), ent.label);
      }
      // Build process participants lookup
      const processParticipantsMap = new Map<string, string[]>();
      for (const proc of data.processes) {
        processParticipantsMap.set(proc.process.toLowerCase(), proc.participants);
      }

      // Track already-added terms to avoid duplicates
      const added = new Set<string>();

      // 1. Named entities → individual with NER-derived type
      for (const ent of data.named_entities) {
        const key = ent.text.toLowerCase();
        if (added.has(key)) continue;
        added.add(key);
        const nodeType = NER_TYPE_MAP[ent.label] ?? 'individual';
        const isClass = nodeType === 'class';
        const displayName = this.capitalize(ent.text);
        // Match the parent relation to the node kind: classes use <is_a>, individuals <instance_of>.
        const cnlLines = [
          `# ${displayName} [${nodeType}]`,
          isClass ? `<is_a> Thing;` : `<instance_of> Thing;`,
        ];
        this.findAllOccurrences(text, ent.text).forEach((pos) => {
          spans.push({
            start: pos,
            end: pos + ent.text.length,
            text: ent.text,
            category: 'nodes',
            confidence: 0.85,
            nodeClassification: isClass ? 'class' : 'individual',
            suggestedNodeType: nodeType,
            suggestedRelation: isClass ? '<is_a>' : '<instance_of>',
            cnlHint: `# ${displayName} [${nodeType}]`,
            cnlLines,
          });
        });
      }

      // 2. Proper nouns → individual
      for (const noun of data.proper_nouns) {
        const key = noun.toLowerCase();
        if (added.has(key)) continue;
        added.add(key);
        const displayName = this.capitalize(noun);
        const cnlLines = [`# ${displayName} [individual]`, `<instance_of> Thing;`];
        this.findAllOccurrences(text, noun).forEach((pos) => {
          spans.push({
            start: pos,
            end: pos + noun.length,
            text: noun,
            category: 'nodes',
            confidence: 0.8,
            nodeClassification: 'individual',
            suggestedNodeType: 'individual',
            suggestedRelation: '<instance_of>',
            cnlHint: `# ${displayName} [individual]`,
            cnlLines,
          });
        });
      }

      // 3. Common nouns → class or transition (if nominalized process)
      for (const noun of data.common_nouns) {
        const key = noun.toLowerCase();
        if (added.has(key)) continue;
        added.add(key);
        const displayName = this.capitalize(noun);
        const isNominalizedProcess = NOMINALIZED_PROCESSES.has(key) || processNounSet.has(key);

        if (isNominalizedProcess) {
          const participants = processParticipantsMap.get(key) ?? [];
          // Every transition needs at least one prior and one post state — prompt for both.
          const cnlLines = [
            `# ${displayName} [Transition]`,
            `<has prior_state> prior Thing;`,
            `<has post_state> post Thing;`,
          ];
          this.findAllOccurrences(text, noun).forEach((pos) => {
            spans.push({
              start: pos,
              end: pos + noun.length,
              text: noun,
              category: 'nodes',
              confidence: 0.85,
              nodeClassification: 'transition',
              suggestedNodeType: 'Transition',
              suggestedRelation: '<has prior_state> / <has post_state>',
              processParticipants: participants,
              cnlHint: `# ${displayName} [Transition]`,
              cnlLines,
            });
          });
        } else {
          const cnlLines = [`# ${displayName} [class]`, `<is_a> Thing;`];
          this.findAllOccurrences(text, noun).forEach((pos) => {
            spans.push({
              start: pos,
              end: pos + noun.length,
              text: noun,
              category: 'nodes',
              confidence: 0.75,
              nodeClassification: 'class',
              suggestedNodeType: 'class',
              suggestedRelation: '<is_a>',
              cnlHint: `# ${displayName} [class]`,
              cnlLines,
            });
          });
        }
      }
    }

    // Relations: predicate verbs and relational prepositions from the dependency
    // parse, plus typed semantic_relations. Each span is tagged with relationKind
    // so the UI can distinguish predicate verbs from relational prepositions.
    if (catSet.has('relations')) {
      // Verb/predicate relations from the dependency parse. A relation token is a
      // verb, so we consider BOTH endpoints of these relations and then drop any
      // token that is actually a noun (it appears in the noun lists) or a copula.
      // This stops e.g. 'cat' — the noun a `relcl` modifies ("cat that hunts") —
      // from being marked a relation, and filters out 'is'/'are' linking verbs.
      const verbRelations = new Set(['ROOT', 'relcl', 'xcomp', 'ccomp', 'advcl', 'conj']);
      const copulas = new Set(['be', 'is', 'are', 'am', 'was', 'were', 'been', 'being']);
      const nounWords = new Set<string>();
      for (const n of [...data.common_nouns, ...data.proper_nouns]) {
        nounWords.add(n.toLowerCase());
        for (const w of n.toLowerCase().split(/\s+/)) nounWords.add(w);
      }
      for (const ent of data.named_entities) {
        nounWords.add(ent.text.toLowerCase());
        for (const w of ent.text.toLowerCase().split(/\s+/)) nounWords.add(w);
      }
      const isVerbToken = (tok: string): boolean => {
        const t = tok.toLowerCase();
        return t.length > 0 && !nounWords.has(t) && !copulas.has(t);
      };
      const verbs = new Set<string>();
      for (const dep of data.dependency_relations) {
        if (!verbRelations.has(dep.relation)) continue;
        if (isVerbToken(dep.governor)) verbs.add(dep.governor);
        if (isVerbToken(dep.dependent)) verbs.add(dep.dependent);
      }
      for (const verb of verbs) {
        this.findAllOccurrences(text, verb).forEach((pos) => {
          spans.push({
            start: pos,
            end: pos + verb.length,
            text: verb,
            category: 'relations',
            confidence: 0.7,
            relationKind: 'verb',
          });
        });
      }
      // Prepositions that signal relationships — kept distinct from predicate verbs.
      const preps = new Set<string>();
      for (const dep of data.dependency_relations) {
        if (dep.relation === 'prep') {
          preps.add(dep.dependent);
        }
      }
      for (const prep of preps) {
        this.findAllOccurrences(text, prep).forEach((pos) => {
          spans.push({
            start: pos,
            end: pos + prep.length,
            text: prep,
            category: 'relations',
            confidence: 0.6,
            relationKind: 'preposition',
          });
        });
      }
      // Typed semantic relations from the full pipeline (predicate verbs).
      for (const rel of data.semantic_relations) {
        const relPhrase = rel.type;
        this.findAllOccurrences(text, relPhrase).forEach((pos) => {
          spans.push({
            start: pos,
            end: pos + relPhrase.length,
            text: relPhrase,
            category: 'relations',
            confidence: 0.85,
            cnlHint: `<${rel.type}> ${rel.to};`,
            relationKind: 'verb',
          });
        });
      }
    }

    // Adjectives
    if (catSet.has('adjectives')) {
      for (const adj of data.adjectives) {
        this.findAllOccurrences(text, adj).forEach((pos) => {
          spans.push({
            start: pos,
            end: pos + adj.length,
            text: adj,
            category: 'adjectives',
            confidence: 0.85,
          });
        });
      }
    }

    // Adverbs
    if (catSet.has('adverbs')) {
      for (const adv of data.adverbs) {
        this.findAllOccurrences(text, adv).forEach((pos) => {
          spans.push({
            start: pos,
            end: pos + adv.length,
            text: adv,
            category: 'adverbs',
            confidence: 0.85,
          });
        });
      }
    }

    // Quantifiers
    if (catSet.has('quantifiers')) {
      for (const q of data.quantifiers) {
        this.findAllOccurrences(text, q).forEach((pos) => {
          spans.push({
            start: pos,
            end: pos + q.length,
            text: q,
            category: 'quantifiers',
            confidence: 0.9,
          });
        });
      }
    }

    // Modalities: extract from dependency_relations (aux modals)
    if (catSet.has('modalities')) {
      const modals = new Set([
        'can',
        'could',
        'may',
        'might',
        'must',
        'shall',
        'should',
        'will',
        'would',
      ]);
      for (const dep of data.dependency_relations) {
        if (dep.relation === 'aux' && modals.has(dep.dependent.toLowerCase())) {
          this.findAllOccurrences(text, dep.dependent).forEach((pos) => {
            spans.push({
              start: pos,
              end: pos + dep.dependent.length,
              text: dep.dependent,
              category: 'modalities',
              confidence: 0.95,
            });
          });
        }
      }
    }

    // Process (full pipeline only)
    if (catSet.has('process') && data.processes.length > 0) {
      for (const proc of data.processes) {
        // Try to find the process description phrase in the text
        const procName = proc.process;
        // Also find participant mentions as process-related
        this.findAllOccurrences(text, procName).forEach((pos) => {
          spans.push({
            start: pos,
            end: pos + procName.length,
            text: procName,
            category: 'process',
            confidence: 0.8,
            cnlHint: `# ${this.capitalize(procName)} [Transition]`,
          });
        });
        // Mark participants
        for (const participant of proc.participants) {
          this.findAllOccurrences(text, participant).forEach((pos) => {
            spans.push({
              start: pos,
              end: pos + participant.length,
              text: participant,
              category: 'process',
              confidence: 0.6,
              cnlHint: `<has prior_state> ${this.capitalize(participant)};`,
            });
          });
        }
      }
    }

    // Attributes (full pipeline only)
    if (catSet.has('attributes') && data.attributes.length > 0) {
      for (const attr of data.attributes) {
        for (const attrVal of attr.attributes) {
          this.findAllOccurrences(text, attrVal).forEach((pos) => {
            spans.push({
              start: pos,
              end: pos + attrVal.length,
              text: attrVal,
              category: 'attributes',
              confidence: 0.7,
              cnlHint: `${attrVal}: value;`,
            });
          });
        }
      }
    }

    // Conditions: qualifiers_context
    if (catSet.has('conditions') && data.qualifiers_context.length > 0) {
      for (const qc of data.qualifiers_context) {
        this.findAllOccurrences(text, qc.phrase).forEach((pos) => {
          spans.push({
            start: pos,
            end: pos + qc.phrase.length,
            text: qc.phrase,
            category: 'conditions',
            confidence: 0.7,
            cnlHint: `modifies: ${qc.modifies}`,
          });
        });
      }
    }

    // Input/Output: look for I/O keywords in dependency relations and process participants
    if (catSet.has('inputOutput')) {
      const ioKeywords = new Set([
        'input',
        'inputs',
        'output',
        'outputs',
        'product',
        'products',
        'reactant',
        'reactants',
        'byproduct',
        'byproducts',
        'substrate',
        'substrates',
        'precursor',
        'result',
        'source',
        'sink',
      ]);
      // Check all words in text against IO keywords
      const wordRegex = /\b\w+\b/g;
      let wordMatch: RegExpExecArray | null;
      while ((wordMatch = wordRegex.exec(text)) !== null) {
        if (ioKeywords.has(wordMatch[0].toLowerCase())) {
          spans.push({
            start: wordMatch.index,
            end: wordMatch.index + wordMatch[0].length,
            text: wordMatch[0],
            category: 'inputOutput',
            confidence: 0.8,
          });
        }
      }
      // (Process participants are intentionally NOT mapped to input/output: they
      // over-matched ordinary nouns like "gazelles"/"cubs". Input/Output now keys
      // off explicit I/O vocabulary only.)
    }

    this.logger.log(`Mapped ${spans.length} spans from NLP service response`);
    return spans;
  }

  /**
   * Finds all occurrences of a word/phrase in text, returning start indices.
   * Uses case-insensitive word-boundary matching.
   */
  private findAllOccurrences(text: string, phrase: string): number[] {
    if (!phrase || phrase.length === 0) return [];
    const positions: number[] = [];
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        positions.push(match.index);
      }
    } catch {
      // If regex fails (e.g., phrase has weird chars), do simple indexOf
      let idx = text.toLowerCase().indexOf(phrase.toLowerCase());
      while (idx !== -1) {
        positions.push(idx);
        idx = text.toLowerCase().indexOf(phrase.toLowerCase(), idx + 1);
      }
    }
    return positions;
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ─── LLM API (Anthropic / OpenAI compatible) ───────────────────

  private async analyzeViaLlmApi(text: string, categories: string[]): Promise<AnalysisResult> {
    const categoryDefinitions: Record<string, string> = {
      nodes: 'Noun phrases and named entities that would become graph nodes.',
      relations: 'Verbs and prepositions expressing relationships between entities.',
      adjectives: 'Qualifying adjectives that modify nouns.',
      adverbs: 'Adverbs that modify verbs or adjectives.',
      attributes: 'Properties, measurements, and quantities with values (e.g. "5 kg").',
      quantifiers: 'Words expressing quantity: all, some, every, most, each, no.',
      modalities: 'Modal verbs: can, must, should, might, could, would, may, shall.',
      process: 'Verbs denoting transformations or state changes.',
      conditions: 'Temporal/causal markers: before, after, when, if, then, until.',
      operations: 'Mathematical or functional expressions.',
      inputOutput: 'Terms indicating what flows into/out of a process.',
    };

    const categoryBlock = categories
      .filter((c) => categoryDefinitions[c])
      .map((c) => `- ${c}: ${categoryDefinitions[c]}`)
      .join('\n');

    const systemPrompt = `You are a linguistic analyzer. Identify text spans matching each category.

Categories:
${categoryBlock}

Return ONLY valid JSON:
{"spans": [{"start": <int>, "end": <int>, "text": "<exact substring>", "category": "<name>", "confidence": <0-1>, "cnlHint": "<CNL notation>"}], "sentenceBoundaries": [<int>]}

Rules:
- start inclusive, end exclusive. text must equal input.slice(start, end).
- Each span belongs to exactly one category.
- Prefer multi-word noun phrases for Nodes.`;

    const userMessage = `Analyze for [${categories.join(', ')}]:\n\n${text}`;

    const apiUrl = this.config.apiUrl!;
    const isAnthropic = apiUrl.includes('anthropic.com');

    let responseText: string;
    if (isAnthropic) {
      responseText = await this.callAnthropicApi(systemPrompt, userMessage);
    } else {
      responseText = await this.callOpenAiCompatibleApi(systemPrompt, userMessage);
    }

    const result = this.parseLlmResponse(responseText, text);
    result.debug = {
      systemPrompt,
      userMessage,
      rawResponse: responseText,
      model: this.config.model,
    };
    return result;
  }

  private async callAnthropicApi(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await fetch(`${this.config.apiUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey!,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Anthropic API error: ${response.status} ${errorBody}`);
      throw new Error(`LLM API returned ${response.status}`);
    }

    const data = (await response.json()) as { content: Array<{ type: string; text: string }> };
    const textBlock = data.content.find((b) => b.type === 'text');
    if (!textBlock) {
      throw new Error('No text block in Anthropic response');
    }
    return textBlock.text;
  }

  private async callOpenAiCompatibleApi(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    const response = await fetch(`${this.config.apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`OpenAI-compatible API error: ${response.status} ${errorBody}`);
      throw new Error(`LLM API returned ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0].message.content;
  }

  private parseLlmResponse(responseText: string, originalText: string): AnalysisResult {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, responseText];
    const jsonStr = jsonMatch[1]!.trim();

    let parsed: { spans?: unknown[]; sentenceBoundaries?: number[] };
    try {
      parsed = JSON.parse(jsonStr) as { spans?: unknown[]; sentenceBoundaries?: number[] };
    } catch {
      this.logger.error(`Failed to parse LLM response as JSON: ${jsonStr.slice(0, 200)}`);
      throw new Error('Invalid JSON response from LLM');
    }

    const spans: TextSpan[] = [];
    if (Array.isArray(parsed.spans)) {
      for (const raw of parsed.spans) {
        const span = raw as Record<string, unknown>;
        const start = Number(span.start);
        const end = Number(span.end);
        if (
          Number.isFinite(start) &&
          Number.isFinite(end) &&
          start >= 0 &&
          end <= originalText.length &&
          start < end &&
          typeof span.category === 'string'
        ) {
          spans.push({
            start,
            end,
            text: originalText.slice(start, end),
            category: span.category as string,
            confidence: typeof span.confidence === 'number' ? span.confidence : 0.5,
            cnlHint: typeof span.cnlHint === 'string' ? span.cnlHint : undefined,
          });
        }
      }
    }

    const sentenceBoundaries: number[] = Array.isArray(parsed.sentenceBoundaries)
      ? (parsed.sentenceBoundaries.filter(
          (b) => typeof b === 'number' && b >= 0 && b <= originalText.length,
        ) as number[])
      : [0];

    return { spans, sentenceBoundaries, source: 'llm' };
  }
}
