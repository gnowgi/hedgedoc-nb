# nodeBook NLP Microservice — Refinement v2 (deterministic-layer quality)

> Apply to the running service in `~/projects/nodebook-nlp/`. The HTTP contract,
> endpoints (`/extract`, `/extract/fast`, `/health`) and JSON shape are CORRECT
> and must NOT change. These fixes only improve the QUALITY of the deterministic
> layer (LLM is currently disabled). The consumer turns these strings verbatim
> into knowledge-graph node/edge names, so noisy strings = noisy graph.

Tested with this paragraph (use it as the regression case):

> Photosynthesis is the fundamental process by which green plants convert light
> energy into chemical energy. Carbon dioxide and water are the main reactants,
> while glucose and oxygen are the products. Most plants can perform
> photosynthesis only when sunlight is available.

---

## FIX 1 — Normalize every noun phrase (highest impact)

Add one helper, e.g. `normalize_np(span) -> str`, and run EVERY emitted noun
phrase through it: `common_nouns`, `proper_nouns`, `processes[].participants`,
`attributes[].entity`, `semantic_relations[].from`, `semantic_relations[].to`.

Rules:
- Strip LEADING determiners/articles, predeterminers, and quantifier-determiners:
  POS `DET`/`PREDET` and words like the/a/an/this/that/these/those/each/every/
  all/most/some/any/no/both/several/many/few + possessives (my/its/their...).
- Drop the phrase entirely if it is a bare pronoun or relative pronoun
  (which/that/who/whom/whose/it/they/this...). Do NOT emit these as nodes or
  participants. (Kills the junk `convert_by -> which` relation.)
- KEEP adjectival modifiers and compound/multiword nouns intact. Do NOT reduce
  to the head noun: "Carbon dioxide", "light energy", "chemical energy",
  "green plants", "main reactants" must stay whole. Only leading FUNCTION words
  are removed.
- Trim surrounding whitespace/punctuation; preserve original casing.

Because only LEADING function words are removed, the result is still a
contiguous substring of the input (the consumer locates it by word-boundary
search), so this stays compatible.

Before -> after for `common_nouns`:
- "the fundamental process" -> "fundamental process"
- "Most plants" -> "plants"
- "the main reactants" -> "main reactants"
- "the products" -> "products"
- "green plants", "Carbon dioxide", "light energy", "chemical energy" -> unchanged

## FIX 2 — Drop copular verbs from `processes`

`processes` currently emits `be`/`are` (5 of 7 entries here). Predication is not
a process/transition and is already captured as an `is_a` semantic_relation.
- Exclude lemma `be` (and other pure copulas) from `processes`.
- Keep only eventive verbs and nominalized process nouns.
- Expected `processes` for the test paragraph: `photosynthesis`, `convert`,
  `perform` only — no `be` entries.
- Also normalize their `participants` via FIX 1 (drop `which`, strip determiners).

## FIX 3 — Guard NER false positives

spaCy tags sentence-initial "Photosynthesis" as `ORG`; the consumer then makes it
an `Organization` node, which is wrong (it is the nominalized process).
- If a named entity's text is also in `common_nouns`, or matches a nominalized-
  process noun, or is a single sentence-initial capitalized token that is
  otherwise a common word, then DROP it from `named_entities` (or reclassify).
- Expected `named_entities` for the test paragraph: empty (no real entities).

## FIX 4 — Tighten `attributes`

Currently predicate-nominal clauses are mislabeled as attributes
(e.g. Photosynthesis -> "the fundamental process by which..."). Attributes should
be real properties/values only:
- Keep: adjectival modifiers (`amod`) and predicate adjectives
  (e.g. plants -> green; sunlight -> available); and measurement patterns
  `NUM (+ unit)` (e.g. "40 degrees", "5 kg").
- Drop: full predicate-nominal complements (those belong to `is_a` relations).
- Expected `attributes` for the test paragraph: only adjective-based, e.g.
  `{entity:"plants", attributes:["green"]}`, `{entity:"sunlight",
  attributes:["available"]}` — NOT the "fundamental process"/"main reactants"/
  "products" clauses.

## Minor (optional)
- A word classified as a quantifier (e.g. "most") need not also appear in
  `adjectives`.
- `qualifiers_context` role: prefer `contrastive` for `while`, `temporal`/
  `conditional` for `when`/`if`. Low impact (consumer only uses `modifies`).

## Acceptance
Re-run both curls on the test paragraph and confirm:
- `common_nouns` / participants / relation endpoints have NO leading
  the/a/most/the-main and NO `which`.
- `processes` has no `be`/`are`.
- `named_entities` does not contain "Photosynthesis" as ORG.
- `attributes` contains only adjective/measurement properties.
- `semantic_relations` keeps `is_a`, `convert`, `convert_into`, `perform`
  with normalized from/to; the `convert_by -> which` row is gone.
- `/extract/fast` still well under 1s; shape and all keys unchanged.
