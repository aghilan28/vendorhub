# VENDORHUB Phase 10 AI Intelligence, Semantic Discovery, and Marketplace Optimization

Internal AI Intelligence, Semantic Discovery, and Marketplace Optimization Constitution for VENDORHUB

Status: locked baseline before intelligence-service, search-service, recommendation-service, and ranking orchestration implementation  
Depends on: Phase 0-9 constitutions  
Scope: marketplace intelligence philosophy, semantic search, hybrid retrieval, pgvector/HNSW vector systems, autocomplete, intent understanding, recommendations, personalization, hyperlocal ranking, cold start, fairness, liquidity optimization, dynamic pricing signals, experimentation, realtime synchronization, observability, recovery, frontend AI state, dashboards, testing, AI-assisted engineering workflow  
Non-goal: generic chatbot architecture or disconnected AI feature experiments

---

## 0. Intelligence Lock

VENDORHUB intelligence is the operating system that decides how buyers discover, how sellers receive demand, how inventory becomes visible, how hyperlocal context changes rank, and how marketplace liquidity is protected.

The central intelligence truth:

```txt
VENDORHUB intelligence turns marketplace state, behavior, location, inventory, and intent into fair, explainable, realtime discovery decisions.
```

Every AI-powered decision must account for:

- buyer intent
- query meaning
- seller trust
- product relevance
- stock availability
- delivery feasibility
- local demand
- price sensitivity
- seller exposure fairness
- cold-start opportunity
- operational reliability
- experimentation assignment
- explainability and auditability

AI in VENDORHUB is not decoration. Search, recommendations, ranking, autocomplete, personalization, pricing signals, and marketplace optimization are shared infrastructure.

---

## 1. Complete Marketplace Intelligence Philosophy

### 1.1 What Intelligence Means in VENDORHUB

Intelligence means VENDORHUB can understand commercial intent, operational constraints, marketplace health, and user context at the same time. A normal catalog system answers "what matches this query?" VENDORHUB must answer "what should this buyer see now, from which seller, in this location, under current inventory and delivery conditions, while preserving marketplace fairness?"

Discovery is infrastructure because it allocates attention. Attention becomes clicks. Clicks become orders. Orders create seller liquidity. Seller liquidity affects trust, retention, assortment quality, and regional density.

Recommendations are operational systems because they move demand across the marketplace. A recommendation unit can rescue slow-moving inventory, accelerate repeat orders, expose new sellers, reduce delivery distance, increase basket size, or damage trust if it feels repetitive, irrelevant, biased, or manipulative.

Search quality affects liquidity because high-intent buyers abandon quickly when results are poor. A weak search system concentrates demand on obvious products and established sellers, starving the long tail. A strong search system interprets intent, retrieves substitutes, balances relevance with availability, and routes demand toward trustworthy supply.

Personalization increases ecosystem efficiency by reducing cognitive work for buyers and reducing wasted impressions for sellers. It must remain bounded by fairness controls so personalization does not become a self-reinforcing tunnel.

Semantic understanding improves trust because buyers do not always name products exactly as the catalog stores them. VENDORHUB must understand synonyms, local language variants, brand/category ambiguity, use cases, attributes, and substitute intent.

Hyperlocal context changes ranking logic because the best result is not always the most semantically relevant result. In a realtime commerce network, nearby availability, ETA confidence, seller preparation speed, regional demand, delivery cost, and current operational load are part of relevance.

### 1.2 Discovery Psychology

Discovery should feel fast, forgiving, and locally aware. Buyers should feel that VENDORHUB understands partial thoughts, misspellings, vague needs, repeat habits, and urgency. The system should reduce the number of decisions needed to reach a trustworthy product without hiding meaningful choice.

The discovery experience must support:

- decisive search for buyers who know what they want
- exploratory browsing for buyers with broad intent
- recovery when exact inventory is unavailable
- substitution when delivery or stock constraints exist
- reassurance through clear ranking explanations where useful

### 1.3 Recommendation Psychology

Recommendations should feel helpful, not invasive. The buyer should understand why an item appears: bought before, often paired, available nearby, trending locally, similar to viewed item, low ETA, good seller reliability, or relevant to the current basket.

Recommendation trust is damaged by repetition, stale suggestions, irrelevant upsells, insensitive pricing, unavailable products, and opaque preference assumptions.

### 1.4 Behavioral Learning Philosophy

Behavior is evidence, not identity. A click is weak evidence. Dwell time is contextual evidence. Carting is stronger evidence. Purchasing is strong evidence. Reordering is durable preference evidence. Repeated ignores are negative evidence.

VENDORHUB must learn from behavior without freezing the buyer into yesterday's pattern. Personalization must combine exploitation with controlled exploration.

### 1.5 Marketplace Liquidity Philosophy

Marketplace liquidity means demand and supply meet with low friction. Intelligence must avoid winner-take-all ranking. It must create controlled exposure for new sellers and products, route demand toward available inventory, and avoid overloading the same sellers when alternatives can satisfy the buyer.

### 1.6 Personalization Ethics and Exposure Fairness

Personalization must be explainable, reversible, and bounded. It must not hide materially better choices, discriminate against sellers without evidence, or create unfair exposure loops. Fairness does not mean equal ranking for all sellers. It means sellers with comparable relevance, trust, availability, and service quality receive comparable opportunity over time.

### 1.7 Intelligence Principles

- Intelligence decisions must be measurable, explainable, and replayable.
- Search and recommendation systems must share signals and governance.
- Hyperlocal availability is part of relevance.
- Personalization must improve utility without collapsing diversity.
- Ranking must preserve buyer trust first, seller fairness second, marketplace economics third; none may be ignored.
- Cold-start traffic is an investment, not noise.
- AI-generated architecture must converge into shared services, schemas, metrics, and review gates.

---

## 2. Complete Search Architecture

VENDORHUB search is a hybrid retrieval and ranking system combining lexical matching, semantic retrieval, intent interpretation, personalization, and hyperlocal operational filtering.

### 2.1 Search Flow

```txt
User Query
↓
Intent Detection
↓
Autocomplete Suggestions
↓
Semantic Retrieval
↓
Hybrid Ranking
↓
Personalized Reranking
↓
Hyperlocal Filtering
↓
Final Result Ranking
```

### 2.2 User Query

Inputs:

- raw query text
- locale and language hints
- user id or anonymous session id
- geohash/H3 cell and delivery address context
- active cart
- recent searches
- recent views
- app surface and entry point

Metrics:

- query volume
- empty query rate
- query abandonment
- time to first result
- query reformulation rate

### 2.3 Intent Detection

Intent classes:

- exact product intent
- category intent
- brand intent
- seller intent
- attribute intent
- problem/use-case intent
- reorder intent
- price-sensitive intent
- urgent/delivery-sensitive intent
- exploratory intent

Algorithms:

- lightweight rules for obvious patterns
- embedding similarity against canonical intent templates
- supervised query classifier after enough labeled traffic exists
- session-aware intent smoothing

Data sources:

- query logs
- clicked products
- category taxonomy
- seller names
- product aliases
- local synonyms
- historical conversion paths

Realtime adjustments:

- boost reorder intent when query matches prior purchases
- boost urgent intent when user is in checkout/session with short ETA interactions
- downgrade seller intent when seller is closed or outside delivery radius

Observability:

- intent classification confidence
- intent-to-click alignment
- intent-to-conversion alignment
- misclassified query samples

### 2.4 Autocomplete Engine

Autocomplete exists to accelerate intent expression. It must be fast enough to feel instant and contextual enough to feel intelligent.

Architecture:

- prefix index for products, brands, categories, sellers, and popular queries
- typo-tolerant finite-state or trigram matching for short inputs
- trending query cache by region/H3 cluster
- user-personalized suggestions from purchases, searches, and carts
- intent prediction for partial queries

Suggestion ranking signals:

- prefix match strength
- typo distance
- local popularity
- prior user affinity
- product/category availability
- seller operational status
- query success rate
- freshness of trend

Rules:

- never suggest unavailable-only paths unless paired with alternatives
- diversify suggestions across product, category, and seller intent
- suppress unsafe, abusive, or policy-blocked terms
- avoid showing overly personalized sensitive inference text

Metrics:

- autocomplete latency p50/p95
- suggestion click-through rate
- suggestion-to-search conversion
- typo correction acceptance rate
- zero-result prevention rate

### 2.5 Semantic Retrieval

Semantic retrieval converts query meaning into candidate sets beyond exact keyword matches.

Retrieval sources:

- product embeddings
- category embeddings
- seller embeddings
- query embeddings
- behavioral co-view/co-purchase embeddings

Algorithms:

- pgvector ANN search using HNSW indexes
- cosine similarity for normalized embeddings
- per-vertical similarity thresholds
- candidate caps by category and locality

Signals:

- query-product semantic similarity
- query-category semantic similarity
- synonym and alias confidence
- attribute compatibility
- historical query-result success

Observability:

- semantic candidate recall
- semantic-only click share
- lexical-only rescue share
- semantic drift by category
- low-confidence query clusters

### 2.6 Hybrid Ranking

Hybrid ranking merges lexical and semantic candidates.

Candidate sources:

- BM25/trigram lexical search
- semantic ANN retrieval
- exact SKU/product/title/category matches
- seller name matches
- substitution graph results
- reorder candidates

Base scoring:

```txt
hybrid_score =
  lexical_score * lexical_weight +
  semantic_score * semantic_weight +
  intent_match_score * intent_weight +
  availability_score * availability_weight +
  trust_score * trust_weight
```

Weighting changes by intent:

| Intent | Lexical | Semantic | Personalization | Hyperlocal | Fairness |
| --- | ---: | ---: | ---: | ---: | ---: |
| Exact product | High | Medium | Low | High | Low |
| Category | Medium | High | Medium | High | Medium |
| Reorder | Medium | Medium | High | High | Low |
| Exploratory | Low | High | Medium | Medium | High |
| Urgent | Medium | Medium | Low | Very high | Low |

Metrics:

- search CTR
- add-to-cart rate
- conversion rate
- no-result rate
- result latency
- reformulation rate
- search satisfaction proxy

### 2.7 Personalized Reranking

Personalized reranking modifies the order of already relevant candidates. It must not insert irrelevant products purely because the user previously clicked similar items.

Personalization signals:

- purchase affinity
- category affinity
- brand affinity
- price band affinity
- seller affinity
- delivery speed preference
- dietary/style/attribute preference where applicable
- negative feedback and repeated ignores

Constraints:

- only rerank candidates above minimum relevance
- preserve diversity caps
- preserve seller exposure controls
- provide explainability reason codes

### 2.8 Hyperlocal Filtering

Hyperlocal filtering transforms catalog relevance into operational relevance.

Filters and boosts:

- delivery address serviceability
- seller open/closed state
- current stock
- reserved inventory
- ETA confidence
- delivery cost
- rider capacity by sector
- seller prep reliability

Fallbacks:

- show alternatives when exact products are unavailable
- show "available later" only when useful and explicit
- avoid dead-end result pages

---

## 3. Complete Vector and Embedding Architecture

VENDORHUB vector intelligence represents marketplace objects as semantic and behavioral coordinates.

### 3.1 Embedding Types

Product embeddings:

- title
- description
- category path
- attributes
- brand
- seller context
- image-derived labels when available
- normalized local language aliases

Seller embeddings:

- assortment profile
- category strengths
- region served
- trust/service attributes
- buyer engagement patterns

Behavioral embeddings:

- co-view sequences
- co-cart sequences
- co-purchase sequences
- repeat purchase patterns
- session trails

Search embeddings:

- normalized query text
- query intent labels
- clicked result context
- successful conversion paths

Recommendation embeddings:

- user/session vector
- product vector
- basket vector
- region demand vector
- seller supply vector

### 3.2 Embedding Pipeline

```txt
Source Change
↓
Normalization
↓
Feature Assembly
↓
Embedding Generation
↓
Validation
↓
Versioned Storage
↓
Vector Index Update
↓
Search/Recommendation Readiness
```

Workflows:

- synchronous lightweight refresh for critical product edits
- async batch refresh for catalog backfills
- event-driven refresh after major seller/category changes
- behavioral embedding refresh from streaming events
- scheduled full re-embedding after model or schema upgrades

Embedding lifecycle rules:

- every embedding has model version, input schema version, created timestamp, source hash, and quality status
- stale embeddings remain queryable until replacements are validated
- index swaps are atomic by version or partition
- incompatible embedding dimensions require new columns/indexes, not mutation in place

### 3.3 Vector Database Architecture

Storage:

- PostgreSQL as system of record
- pgvector for embeddings
- HNSW indexes for ANN retrieval
- partitioning by object type, region, and high-volume category where needed

Tables:

- `product_embeddings`
- `seller_embeddings`
- `query_embeddings`
- `user_profile_embeddings`
- `session_embeddings`
- `basket_embeddings`
- `embedding_jobs`
- `embedding_versions`

HNSW indexing strategy:

- separate HNSW indexes per embedding type
- tune `m` and `ef_construction` by corpus size and latency target
- tune query-time `ef_search` by surface criticality
- keep exact scan fallback for low-volume partitions and evaluation jobs

Similarity thresholds:

- exact intent: higher semantic threshold
- exploratory intent: lower threshold plus diversity controls
- substitute intent: category-compatible threshold
- recommendation retrieval: threshold plus novelty/diversity rules

Latency vs accuracy philosophy:

- autocomplete must favor latency
- search must balance recall and ranking quality
- recommendations may use cached candidates with realtime reranking
- admin analytics may use slower exact evaluation

---

## 4. Complete Recommendation Engine Architecture

Recommendations are demand-routing systems. They must optimize buyer utility, seller liquidity, inventory movement, delivery feasibility, and marketplace trust.

### 4.1 Recommendation Flow

```txt
Behavior Collection
↓
Feature Extraction
↓
Embedding Generation
↓
Candidate Retrieval
↓
Ranking Pipeline
↓
Contextual Filtering
↓
Realtime Reranking
↓
Recommendation Delivery
```

### 4.2 Behavior Collection

Events:

- impression
- click
- view
- dwell
- search
- add to cart
- remove from cart
- checkout start
- purchase
- reorder
- favorite
- hide/not interested

Rules:

- impressions require viewport confirmation
- repeated impressions without engagement become weak negative evidence
- cart and purchase events outweigh clicks
- event schemas must include surface, rank position, experiment id, and reason codes

Metrics:

- event completeness
- delayed event rate
- duplicate event rate
- attribution coverage

### 4.3 Feature Extraction

Features:

- user affinity vector
- session intent vector
- basket complement vector
- product popularity by region
- seller reliability
- stock pressure
- ETA quality
- price sensitivity
- novelty exposure history

Realtime adjustments:

- active cart changes
- inventory depletion
- seller closure
- sudden local trend
- repeated ignored recommendation

### 4.4 Candidate Retrieval

Candidate generators:

- collaborative filtering
- content-based similarity
- session-based sequence retrieval
- basket complements
- reorder candidates
- local trending products
- new seller/product exploration
- inventory-relief candidates
- delivery-efficient candidates

Hybrid recommendation policy:

- combine multiple candidate generators
- enforce per-generator quotas
- keep diversity by category, seller, and price band
- retain reason codes for each candidate

### 4.5 Ranking Pipeline

Ranking score:

```txt
recommendation_score =
  relevance_score +
  personalization_score +
  conversion_probability +
  delivery_feasibility_score +
  inventory_utility_score +
  seller_trust_score +
  novelty_score +
  fairness_adjustment -
  repetition_penalty -
  unavailability_penalty
```

Models:

- heuristic scoring for initial launch
- learning-to-rank after labeled traffic
- contextual bandits for exploration
- sequence models only after reliable event volume exists

Metrics:

- recommendation CTR
- add-to-cart rate
- conversion rate
- revenue per mille
- diversity
- novelty
- repeated impression fatigue
- seller exposure distribution
- local delivery efficiency

### 4.6 Recommendation Types

Homepage recommendations:

- personalized reorder rail
- available near you
- local trending
- new in your area
- deals matching your history
- category exploration

PDP recommendations:

- similar products
- substitutes from nearby sellers
- frequently bought together
- same seller complements
- faster delivery alternatives

Checkout recommendations:

- basket complements
- threshold helpers
- forgotten repeat items
- low-ETA add-ons
- lightweight inventory-aware upsells

Reorder recommendations:

- purchase cadence prediction
- replenishment windows
- price and availability awareness
- substitute suggestion when prior item is unavailable

Trending systems:

- regional trend detection
- time-window decay
- anomaly filtering
- stock-aware trend suppression

Delivery-aware recommendations:

- nearby inventory
- same-route/same-seller complements
- low incremental delivery cost products
- ETA-safe products only

Placement psychology:

- homepage can explore
- PDP must preserve product intent
- checkout must be restrained
- reorder should feel practical
- trending should feel local and fresh

---

## 5. Complete Personalization Engine

Personalization converts behavior, context, and constraints into a buyer-specific ranking layer.

### 5.1 Personalization Signals

Click signals:

- weak positive
- position-adjusted
- discounted when bounce follows

Dwell-time signals:

- positive only when normalized by page type
- negative when short dwell follows misleading recommendation

Cart signals:

- strong purchase intent
- basket complement source
- price sensitivity source

Purchase signals:

- durable preference
- cadence learning source
- seller/category affinity source

Delivery preferences:

- ETA tolerance
- preferred delivery windows
- distance/fee sensitivity

Pricing preferences:

- preferred price bands
- discount responsiveness
- premium willingness

Timing preferences:

- daypart behavior
- weekday/weekend patterns
- reorder cycles

### 5.2 User-Intent Modeling

VENDORHUB maintains multiple preference layers:

- long-term profile
- recent session intent
- active basket intent
- regional context
- operational context

Conflict rule:

- active intent outranks long-term preference
- hard availability outranks personalization
- relevance threshold outranks all personalization boosts

### 5.3 Contextual Intelligence

Time-of-day personalization:

- morning essentials
- lunch/evening demand patterns
- late-hour availability constraints

Weather-aware recommendations:

- weather-derived demand boosts only when regionally validated
- never rely on weather alone

Hyperlocal personalization:

- region-specific brands
- local seller affinity
- local trend awareness
- delivery-sector capacity awareness

Inventory-aware ranking:

- suppress low-confidence stock
- boost abundant relevant inventory
- expose near-expiry or slow-moving inventory only when buyer utility remains high

---

## 6. Complete Marketplace Liquidity and Fairness Architecture

Marketplace intelligence must distribute opportunity without sacrificing buyer trust.

### 6.1 Seller Exposure Balancing

Exposure is tracked by:

- impressions
- qualified impressions
- clicks
- add-to-cart events
- conversions
- revenue
- category-relative share
- region-relative share
- fairness-adjusted opportunity

Balancing controls:

- exposure caps for over-dominant sellers
- controlled boosts for underexposed qualified sellers
- diversity constraints per result page/rail
- fairness-aware exploration buckets

### 6.2 Cold-Start Engine

New-seller strategy:

- verify onboarding quality
- assign introductory exposure budget
- place in exploration slots where relevance is sufficient
- measure buyer response quickly
- ramp exposure based on service quality

New-product strategy:

- infer category and attribute relevance
- use seller embedding and category priors
- test in low-risk recommendation slots
- graduate to normal ranking after performance evidence

Exploration/exploitation:

- reserve small percentage of ranking/recommendation inventory for exploration
- never place cold-start items above strong exact-intent results without relevance
- use bandit allocation after sufficient traffic

### 6.3 Fairness System

Fairness metrics:

- exposure share vs eligible inventory share
- exposure share vs quality-adjusted supply share
- conversion opportunity by seller cohort
- cold-start graduation rate
- diversity by category and seller
- suppressed-seller diagnostics

Recommendation neutrality:

- the system may prefer better service quality
- the system must not create hidden permanent exclusion
- fairness adjustments must be logged and auditable

---

## 7. Complete Ranking System Architecture

Ranking is a staged pipeline, not one score.

### 7.1 Ranking Pipeline

```txt
Candidate Generation
↓
Eligibility Filtering
↓
Base Relevance Scoring
↓
Operational Scoring
↓
Personalization Scoring
↓
Fairness and Diversity Adjustment
↓
Business Constraint Check
↓
Final Rerank
↓
Reason Code Emission
```

### 7.2 Ranking Signals

Relevance:

- lexical match
- semantic similarity
- category fit
- attribute fit
- query intent match

Personalization:

- affinity
- repeat behavior
- price band preference
- seller preference
- negative feedback

Hyperlocal:

- distance
- ETA
- delivery fee
- rider capacity
- sector congestion

Trust:

- seller rating
- fulfillment reliability
- cancellation rate
- refund/dispute rate
- moderation state

Inventory:

- stock availability
- stock confidence
- inventory depth
- reservation pressure

Conversion:

- historical engagement
- category demand
- product quality
- pricing competitiveness

### 7.3 Ranking Weight Matrix

| Surface | Relevance | Personalization | Hyperlocal | Trust | Inventory | Fairness |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Search exact | 45 | 10 | 20 | 10 | 10 | 5 |
| Search category | 30 | 15 | 20 | 10 | 10 | 15 |
| Homepage | 20 | 25 | 15 | 10 | 10 | 20 |
| PDP similar | 40 | 10 | 15 | 10 | 10 | 15 |
| Checkout | 25 | 20 | 25 | 10 | 15 | 5 |
| Reorder | 25 | 35 | 20 | 10 | 10 | 0 |

Weights are policy defaults. Experiments may alter them only through the experimentation framework and must emit versioned ranking configs.

### 7.4 Reranking Workflows

Reranking occurs when:

- inventory changes
- seller closes
- ETA risk changes
- user cart changes
- recommendation fatigue appears
- fairness budgets require correction

Every rerank must preserve:

- result identity trace
- previous rank
- new rank
- reason code
- triggering event

---

## 8. Complete AI-Powered Discovery UX

AI discovery UX should feel like fast commerce intuition, not a chatbot bolted onto a catalog.

### 8.1 Conversational Discovery

Conversational discovery supports broad or ambiguous needs:

- "snacks for tonight"
- "quick breakfast"
- "budget cleaning supplies"
- "something similar but faster"

Rules:

- convert conversation into structured filters and candidate sets
- show products, not long prose
- keep explanations short and reason-coded
- never invent unavailable inventory

### 8.2 Search Suggestions and Predictive UX

UX surfaces:

- predictive query suggestions
- typo correction
- local trending chips
- recent/reorder suggestions
- substitute prompts
- filter suggestions based on intent

### 8.3 Recommendation Choreography

Transitions:

- update rails when cart changes
- avoid full-page jumps
- show stable skeletons during refresh
- preserve dismissed recommendation state
- prevent rapid flickering from realtime reranks

Refresh behavior:

- homepage rails refresh on app open and meaningful context changes
- PDP recommendations refresh on product and location change
- checkout recommendations refresh on cart, inventory, and ETA changes

---

## 9. Complete Dynamic Pricing and Marketplace Optimization

VENDORHUB dynamic pricing is a signal architecture. Pricing decisions must remain governed, explainable, and constrained.

### 9.1 Pricing Signals

Demand-aware:

- regional demand spikes
- search trend velocity
- conversion pressure
- stockout risk

Inventory-aware:

- slow-moving stock
- near-expiry stock where applicable
- overstocked products
- scarce products

Delivery-cost-aware:

- distance
- route density
- rider availability
- sector congestion

Fairness constraints:

- no hidden discriminatory pricing
- cap surge-like adjustments
- preserve displayed price consistency during checkout windows
- audit all pricing recommendation inputs

### 9.2 Pricing Adjustment Workflow

```txt
Signal Detection
↓
Eligibility Check
↓
Constraint Evaluation
↓
Suggested Adjustment
↓
Seller/Admin Policy Application
↓
Experiment/Approval Gate
↓
Price Publication
↓
Recommendation Coordination
```

Recommendation-price coordination:

- avoid recommending products with unstable checkout prices
- boost valid discounts only when inventory and seller reliability support fulfillment
- record price exposure in recommendation attribution

---

## 10. Complete Analytics and Feedback Loop Architecture

VENDORHUB learns through closed loops.

### 10.1 Core Metrics

Search:

- CTR
- add-to-cart rate
- conversion rate
- no-result rate
- reformulation rate
- query latency
- semantic recall

Recommendations:

- CTR
- conversion rate
- revenue contribution
- diversity
- novelty
- fatigue
- seller exposure distribution

Personalization:

- personalized uplift
- repeat purchase lift
- relevance complaints
- filter overrides
- diversity retention

Ranking:

- NDCG on judged sets
- position bias corrected CTR
- rank instability
- fairness deviation
- operational rescue rate

### 10.2 Feedback Pipelines

```txt
Client Events
↓
Event Validation
↓
Stream Processing
↓
Feature Store Updates
↓
Offline Analytics
↓
Model/Rule Evaluation
↓
Config or Model Promotion
```

Online learning workflow:

- update session vectors immediately
- update user profiles with delayed confidence
- update popularity windows continuously
- promote model changes through offline evaluation and experiment gates

---

## 11. Complete Experimentation and A/B Testing Architecture

Experiments protect the marketplace from intuition-only optimization.

Experiment types:

- ranking weights
- retrieval thresholds
- recommendation generator quotas
- personalization intensity
- fairness budgets
- pricing signals
- autocomplete ranking

Rules:

- deterministic assignment by user/session
- experiment ids attached to impressions and conversions
- mutually exclusive layers for conflicting experiments
- guardrail metrics required before launch
- rollback criteria defined before activation

Metric attribution:

- surface
- rank position
- candidate source
- reason code
- experiment variant
- inventory and ETA context

Governance:

- no experiment may bypass trust/safety eligibility
- seller fairness impact must be reviewed
- pricing experiments require stricter approval

---

## 12. Complete Realtime Synchronization Architecture

Realtime intelligence keeps rankings consistent with marketplace reality.

### 12.1 Realtime Update Sources

- inventory changed
- product unavailable
- seller opened/closed
- seller prep time changed
- rider capacity changed
- region congestion changed
- cart changed
- checkout started
- user dismissed recommendation

### 12.2 Synchronization Flow

```txt
Domain Event
↓
Intelligence Event Router
↓
Affected Surface Resolver
↓
Cache Invalidation
↓
Candidate/Rerank Refresh
↓
WebSocket Push or Pull Hint
↓
Client State Reconciliation
```

Stale-ranking recovery:

- mark stale recommendation groups
- revalidate top N results before checkout-critical actions
- fall back to last known good ranking with availability checks

Recommendation invalidation:

- product stockout
- seller unavailable
- price changed beyond tolerance
- repeated user dismissal
- experiment config changed

---

## 13. Complete AI Observability and Governance

AI systems must be visible as operational infrastructure.

### 13.1 Monitoring

Ranking drift:

- score distribution changes
- rank volatility
- category-level ranking shifts
- seller cohort exposure changes

Embedding drift:

- embedding norm anomalies
- nearest-neighbor instability
- category cluster movement
- stale embedding percentage

Recommendation quality:

- fatigue
- diversity collapse
- low-confidence overexposure
- unavailable recommendation rate

Personalization anomalies:

- over-personalization
- sudden preference shifts
- negative feedback spikes
- cohort-level poor outcomes

### 13.2 Dashboards

AI health dashboard:

- service latency
- candidate generation success
- embedding freshness
- cache hit rate
- fallback usage

Fairness dashboard:

- seller exposure distribution
- cold-start budget usage
- cohort-level conversion opportunity
- suppressed seller diagnostics

Explainability:

- every ranking/recommendation emits reason codes
- admin can inspect top scoring factors
- experiments and config versions are attached

---

## 14. Complete Failure and Recovery Architecture

AI failure must degrade into trustworthy commerce, not broken discovery.

Failure modes:

- embedding generation failure
- vector index unavailable
- recommendation service outage
- ranking config error
- stale inventory in recommendations
- realtime synchronization failure

Fallback systems:

- lexical search fallback
- popularity-by-region fallback
- reorder fallback
- rule-based complements
- last known good recommendations
- trust and availability-first ranking

Recovery flows:

- detect failure
- freeze unsafe model/config rollout
- route traffic to fallback
- preserve observability
- repair embeddings/indexes
- replay missed events
- compare recovered output against baseline

Graceful degradation philosophy:

- never show unavailable products as buyable
- never hide checkout-critical changes
- prefer boring reliable ranking over clever broken ranking
- tell operations when AI is degraded

---

## 15. Complete Frontend State Orchestration

Frontend intelligence state must be stable, realtime-aware, and explainable.

State ownership:

- server owns eligibility, rank, price, availability, and reason codes
- client owns presentation state, dismissed items, loading state, and optimistic interaction state
- shared contract owns recommendation group ids and version ids

Caching:

- cache recommendation groups by user/session/location/surface
- invalidate by inventory, seller state, cart, address, and experiment version
- use stale-while-revalidate for non-critical surfaces
- force revalidation for checkout surfaces

Optimistic rendering:

- allow immediate hide/save/cart feedback
- reconcile with server rerank
- do not optimistically show price/availability changes

Realtime synchronization:

- WebSocket pushes invalidation hints
- client requests refreshed groups
- stable item ids prevent visual flicker
- rank changes animate only where useful

---

## 16. Complete Search and AI Analytics Dashboards

Operational dashboards must show whether intelligence is improving the ecosystem.

Search-quality dashboard:

- query funnel
- top failing queries
- zero-result clusters
- reformulation paths
- semantic vs lexical contribution
- typo correction acceptance

Recommendation dashboard:

- rail-level CTR and conversion
- candidate generator contribution
- fatigue heatmap
- diversity score
- unavailable recommendation rate
- seller exposure by rail

Personalization dashboard:

- uplift by cohort
- personalization intensity
- diversity retention
- negative feedback
- anonymous vs known performance

Marketplace-liquidity dashboard:

- exposure distribution
- cold-start impressions
- seller opportunity score
- inventory movement impact
- regional supply-demand mismatch

Fairness analytics:

- exposure heatmaps
- category fairness drift
- seller cohort comparisons
- intervention history

---

## 17. Complete Engineering Governance

AI systems must be built as shared platform infrastructure.

### 17.1 Conventions

Embedding conventions:

- version every model and input schema
- store source hash
- track freshness
- never mix dimensions in one indexed column

Vector query standards:

- define threshold per surface
- require candidate source labels
- require latency budget
- log vector model version

Ranking conventions:

- ranking configs are versioned
- weights are not hardcoded in UI
- every result emits reason codes
- fairness adjustments are explicit

Recommendation conventions:

- every rail has a purpose
- every candidate has a generator source
- every impression has attribution context
- every dismissal becomes feedback

Experimentation conventions:

- experiments are isolated
- guardrails are mandatory
- seller fairness impact is reviewed
- rollback is predeclared

### 17.2 Fragmentation Prevention

Do not create separate intelligence logic inside frontend apps, seller tools, admin tools, or one-off services. All ranking, recommendations, embeddings, experimentation, and reason-code contracts must pass through shared intelligence services or approved libraries.

---

## 18. Complete Testing Strategy

Testing must validate both algorithmic quality and ecosystem outcomes.

Semantic-search tests:

- synonym queries
- typo queries
- local language aliases
- unavailable exact match recovery
- category ambiguity

Ranking simulations:

- exact intent
- exploratory intent
- urgent delivery intent
- low stock
- closed seller
- high trust vs low trust tradeoff

Cold-start simulations:

- new seller with strong inventory
- new seller with weak fulfillment
- new product in popular category
- exposure budget exhaustion

Personalization drift tests:

- repeated click bias
- session intent overriding long-term profile
- negative feedback suppression
- diversity preservation

Fairness testing:

- seller cohort exposure
- category-level concentration
- cold-start graduation
- over-dominant seller caps

Chaos tests:

- vector DB unavailable
- stale embeddings
- delayed behavior events
- inventory stream outage
- ranking config rollback
- recommendation cache corruption

Validation philosophy:

- offline metrics are necessary but insufficient
- simulations catch policy failures
- experiments validate marketplace impact
- observability validates production reality

---

## 19. Complete AI-Assisted AI Engineering Workflow

VENDORHUB is built with Claude, Codex, and AI-assisted engineering. AI must reinforce the architecture rather than fragment it.

### 19.1 Prompt Families

Search implementation prompt:

```txt
Implement this search change using the Phase 10 search architecture. Preserve hybrid retrieval, reason codes, ranking config versioning, observability events, and fallback behavior. Do not add UI-side ranking logic.
```

Recommendation implementation prompt:

```txt
Implement this recommendation surface using candidate generators, ranking stages, contextual filters, fatigue controls, seller fairness checks, and impression attribution. Emit reason codes and experiment ids.
```

Vector implementation prompt:

```txt
Add or modify embedding logic with model versioning, input schema versioning, source hashes, freshness tracking, pgvector storage, HNSW index compatibility, and atomic reindex behavior.
```

Personalization prompt:

```txt
Modify personalization only through approved signal weights and profile/session feature contracts. Preserve relevance thresholds, diversity controls, negative feedback handling, and explainability.
```

Ranking review prompt:

```txt
Review this ranking change for relevance quality, hyperlocal correctness, seller fairness, inventory safety, experiment isolation, observability, and fallback behavior.
```

Fairness review prompt:

```txt
Review this change for seller exposure concentration, cold-start opportunity, recommendation diversity, hidden exclusion risk, and auditability.
```

### 19.2 AI Engineering Rules

- AI-generated code must reference existing contracts.
- New models require evaluation plans.
- New ranking signals require definitions, owners, and observability.
- New recommendation rails require purpose, candidate generators, metrics, and failure behavior.
- Any AI-generated architectural change must be checked against this Phase 10 constitution.

---

## 20. Complete Implementation Sequencing

### 20.1 Dependency Graph

```txt
Event Tracking
↓
Feature Contracts
↓
Embedding Storage
↓
Vector Indexes
↓
Hybrid Search
↓
Ranking Service
↓
Recommendation Candidate Generators
↓
Recommendation Ranking
↓
Personalization Profiles
↓
Experimentation Framework
↓
Realtime Reranking
↓
Dynamic Optimization
```

### 20.2 Exact Implementation Order

1. Define event schemas for search, impressions, clicks, carts, purchases, dismissals, and recommendation attribution.
2. Build feature contracts for products, sellers, users, sessions, baskets, inventory, delivery, and region.
3. Add pgvector storage, embedding version tables, freshness tracking, and HNSW indexes.
4. Implement product, seller, query, session, and basket embedding pipelines.
5. Build lexical search with typo tolerance and structured filters.
6. Build semantic retrieval and hybrid search merge.
7. Implement intent detection and autocomplete.
8. Implement ranking service with versioned configs and reason codes.
9. Add hyperlocal filtering using inventory, seller state, ETA, and serviceability.
10. Build baseline recommendation candidate generators.
11. Build recommendation ranking, fatigue controls, and delivery-aware filters.
12. Add personalization profiles and session learning.
13. Add cold-start exposure budgets and fairness analytics.
14. Add experimentation assignment, metrics, and rollback.
15. Add realtime invalidation and WebSocket refresh hints.
16. Add dynamic pricing signal suggestions with governance gates.
17. Add AI observability, dashboards, drift monitoring, and admin explainability.
18. Run simulations, offline evaluation, controlled experiments, and staged regional rollout.

### 20.3 Activation Gates

Before realtime AI orchestration is enabled, VENDORHUB must have:

- reliable event attribution
- inventory/serviceability correctness
- versioned ranking configs
- search and recommendation fallbacks
- seller fairness dashboards
- experiment isolation
- reason-code logging
- stale-state recovery
- operational rollback

Realtime orchestration without these gates would create fast-moving opacity. VENDORHUB intelligence must be fast, but it must also be governable.

---

## Final Phase 10 Lock

Phase 10 establishes VENDORHUB as a realtime intelligent commerce orchestration platform. Search, recommendations, personalization, ranking, vector retrieval, cold-start mitigation, fairness, pricing signals, experimentation, and observability are one marketplace intelligence layer.

The system is successful when buyers find relevant available products quickly, sellers receive fair opportunity, inventory moves intelligently, local operations remain stable, and every AI-driven marketplace decision can be measured, explained, recovered, and improved.
