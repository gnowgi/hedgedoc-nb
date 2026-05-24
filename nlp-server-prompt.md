# nodeBook NLP Microservice — Build & Deploy Prompt

> Paste this into a Claude Code session running on (or with access to) the `ft`
> server. It is self-contained: no access to the HedgeDoc repo is required.

---

Build and deploy a dockerized NLP microservice on this server (hostname `ft`,
96-core Xeon, ~117 GB free RAM, Docker 25 + Compose v2, assume NO GPU). It
decomposes English science-textbook prose into structural and semantic parts
for an educational knowledge-graph tool. A separate backend consumes its output
and maps it to a controlled natural language — so OUTPUT LINGUISTIC ANALYSIS
ONLY, never CNL.

Create everything under `~/projects/nodebook-nlp/`. Run it via docker compose on
a FREE host port: check `ss -ltn` and use 8008 if free, otherwise pick the next
free port and tell me which.

## HARD API CONTRACT — match exactly

Two POST endpoints, both take `{"text": "<string, max 10000 chars>"}` and return
the SAME JSON shape. Add `GET /health` -> `{"status":"ok"}`.

- `POST /extract/fast` : STRUCTURAL ONLY. spaCy only, NO LLM. Must return in well
  under 1s. Leave semantic arrays empty.
- `POST /extract`      : STRUCTURAL + SEMANTIC (deterministic scaffold + LLM
  refinement). May take a few seconds.

Response JSON (all keys always present):

```json
{
  "input_text": "string",
  "common_nouns": ["..."],
  "proper_nouns": ["..."],
  "named_entities": [{"text":"...","label":"PERSON|ORG|GPE|LOC|PRODUCT|EVENT|WORK_OF_ART|NORP|FAC|QUANTITY|DATE|TIME"}],
  "adjectives": ["..."],
  "adverbs": ["..."],
  "quantifiers": ["..."],
  "qualifiers": ["..."],
  "processes": [{"process":"...","participants":["..."],"description":"..."}],
  "attributes": [{"entity":"...","attributes":["..."]}],
  "semantic_relations": [{"type":"...","from":"...","to":"...","description":"..."}],
  "qualifiers_context": [{"phrase":"...","role":"...","modifies":"..."}],
  "dependency_relations": [{"governor":"...","dependent":"...","relation":"..."}],
  "elapsed_seconds": 0.0
}
```

### How the consumer uses each field (derive accordingly)

- `common_nouns`: noun-chunk / head-NOUN surface strings -> class nodes.
- `proper_nouns`: PROPN strings -> individual nodes.
- `named_entities`: doc.ents (text + standard spaCy `label_`).
- `adjectives` / `adverbs`: ADJ / ADV tokens.
- `quantifiers`: all, some, every, most, each, no, many, few, several... (+ DET/predet).
- `qualifiers`: degree/hedge adverbs (very, fairly, slightly, nearly...). Best-effort.
- `dependency_relations`: `token.head.text` (governor), `token.text` (dependent),
  `token.dep_` (relation). MUST surface these labels where present: ROOT, relcl,
  xcomp, ccomp, advcl, conj (the consumer pulls relation verbs from these),
  prep (relation prepositions), aux (modality: can/could/may/might/must/shall/
  should/will/would).
- `processes`: events/transformations. process = predicate (verb OR nominalized
  process noun like photosynthesis/oxidation), participants = subject/object/obl
  noun phrases, description = short gloss.
- `attributes`: entity = noun, attributes = its property/value phrases
  (e.g. "40 degrees", "green", measurements NUM+unit).
- `semantic_relations`: typed triples. type = relation phrase, from = subject,
  to = object, description = gloss.
- `qualifiers_context`: conditional/temporal/causal markers (when/if/before/after/
  because/unless/until). phrase = the marker phrase, role = temporal|causal|
  conditional, modifies = the predicate/clause it scopes.
- `elapsed_seconds`: server-side processing time.

## ARCHITECTURE — hybrid, three layers

Python 3.11 + FastAPI + Uvicorn + spaCy.

1. **STRUCTURAL** (deterministic, both endpoints): load spaCy `en_core_web_md`
   once at startup (env `SPACY_MODEL`, allow `en_core_web_trf` for higher
   accuracy). Produce all structural fields above. No randomness — fully
   reproducible.

2. **SEMANTIC SCAFFOLD** (deterministic, `/extract` only): dependency-based
   predicate-argument + SVO triple extraction (textacy
   `subject_verb_object_triples`, or hand-rolled from the dep tree if
   textacy/spaCy versions clash). Detect nominalized-process nouns, NUM+unit
   attribute patterns and "X is ADJ"/"X has Y" via spaCy Matcher, and
   condition/temporal/causal markers. Emit candidate processes /
   semantic_relations / attributes / qualifiers_context.

3. **LLM REFINEMENT** (`/extract` only): pass the sentences + the deterministic
   candidates to a LOCAL LLM via Ollama (service in the same compose; default
   model env `LLM_MODEL=qwen2.5:7b-instruct`, CPU inference is fine here). Ask it
   to correct/complete ONLY the semantic fields, returning STRICT JSON matching
   the schema, using Ollama `format: json`. Ground it on the candidates to
   minimize hallucination.
   **GRACEFUL DEGRADATION (critical):** if `LLM_ENABLED=false`, or Ollama is
   unreachable, or it exceeds `LLM_TIMEOUT` (default 20s), or returns invalid
   JSON -> return the deterministic scaffold results and still respond 200.
   NEVER 500 because the LLM misbehaved.

## DOCKERIZATION

- `docker-compose.yml` with two services: `nlp` (FastAPI app) and `ollama`
  (ollama/ollama image, models in a persistent named volume).
- Bake the spaCy model into the nlp image (`RUN python -m spacy download
  en_core_web_md`).
- Document/automate pulling the LLM: `docker compose exec ollama ollama pull
  qwen2.5:7b-instruct`.
- This is a SHARED busy box: cap CPU usage (uvicorn workers small, set
  `OLLAMA_NUM_PARALLEL`/threads sensibly) so we don't hog it.
- Expose nlp on the chosen free host port. Add a compose healthcheck on `/health`.
- All config via env: `SPACY_MODEL`, `LLM_ENABLED`, `OLLAMA_URL`, `LLM_MODEL`,
  `LLM_TIMEOUT`, `PORT`.

## ACCEPTANCE TEST

Bring it up and verify with this paragraph:

> Photosynthesis is the fundamental process by which green plants convert light
> energy into chemical energy. Carbon dioxide and water are the main reactants,
> while glucose and oxygen are the products. Most plants can perform
> photosynthesis only when sunlight is available.

```bash
curl -s localhost:<PORT>/extract/fast -H 'content-type: application/json' \
  -d '{"text":"<paragraph>"}' | jq
curl -s localhost:<PORT>/extract -H 'content-type: application/json' \
  -d '{"text":"<paragraph>"}' | jq
```

Sanity expectations: common_nouns include plants/energy/reactants/products;
adjectives include green/chemical/main; quantifiers include most;
dependency_relations include an `aux` edge for "can" and ROOT verbs
convert/perform. `/extract` additionally returns a process for
photosynthesis/convert with participants, semantic_relations triples, and a
qualifiers_context entry for "when sunlight is available". `/extract/fast` must
be well under 1s.

## DELIVERABLES

- Working `docker compose up -d` in `~/projects/nodebook-nlp/`, healthcheck green.
- README with the env vars, the model-pull step, and example curls.
- Print the final base URL to hand back: `http://192.168.10.3:<PORT>`
  (this server's VPN IP + chosen port).
