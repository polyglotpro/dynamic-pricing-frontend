# Demo Screen Storyline

This is the presentation flow for the capstone demo.
The datasets are intentionally designed to reinforce the same examples across the report, presentation, simulation, and viva.

## Core Thesis

Most retailers optimize pricing and advertising separately.
Our framework coordinates pricing, advertising, inventory, seasonality, and governance through a shared orchestration layer.
Separate optimization destroys value.
Coordinated optimization protects margin, inventory, and advertising efficiency.

## Datasets

- Dataset A: `demo-datasets/everyday_trading_demo.csv`
- Dataset B: `demo-datasets/end_of_season_clearance_demo.csv`
- Dataset C: `demo-datasets/conflict_governance_demo.csv`
- Hero sequence: `demo-datasets/hero_demo_sequence.csv`

## Primary Demo Flow

1. Upload Dataset A.
2. Show Dashboard.
3. Highlight one healthy kurta and one competitor-pressure kurta.
4. Upload Dataset B.
5. Show Inventory first.
6. Then show Dashboard to show the sell-through posture.
7. Upload Dataset C.
8. Show the premium kurta and premium saree governance cases.
9. Open the recommendation drilldown for one SKU.
10. Show Activity for audit and explainability.
11. Finish with the hero sequence.

## What To Skip In The Primary Demo

- Skip the login screen.
- Keep Data History out of the main flow.
- Only open Data History if someone asks how uploads are tracked.

## Screen 1: Upload / Data Ingestion

### What changes after Dataset A

- The active catalog changes to Dataset A.
- The upload creates the first visible operational state.
- The recommendation set should lean toward healthy trading behavior.

### What changes after Dataset B

- The active catalog switches to winter clearance.
- The system should clearly feel different from Dataset A.

### What changes after Dataset C

- The active catalog becomes the premium governance dataset.
- The demo should now feel constrained, strategic, and policy-aware.

### What to say

- “We start by loading a new commercial situation.”
- “Each upload changes the engine’s operating mode.”

## Screen 2: Dashboard

### Dataset A

- Expected recommendation mix:
  - `hold_price`
  - `increase_spend`
  - `reduce_spend`
  - selective price adjustment
- Showcase SKU:
  - `FabIndia Cotton Kurta`
- Expected outcome:
  - hold price
  - increase spend

### Narrative

- “This is a healthy business. The system avoids unnecessary discounting.”
- “For the flagship kurta, the engine supports demand without breaking discipline.”

### Dataset A second kurta example

- Showcase SKU:
  - `FabIndia Indigo Kurta`
- Expected outcome:
  - small markdown
  - controlled ad support

### Narrative

- “Competitor pressure exists, but the system responds carefully rather than blindly discounting.”

### Dataset B

- Expected recommendation mix:
  - `sell_through`
  - `clearance`
  - `markdown`
  - inventory-driven decisions
- The dashboard should shift away from growth language and toward liquidation language.

### Dataset C

- Expected recommendation mix:
  - `governance override`
  - `conflict resolution`
  - `margin protection`
- The dashboard should show that the best mathematical move is not always allowed.

### What the audience should notice

- Dataset A looks healthy and controlled.
- Dataset B looks urgent and clearance-heavy.
- Dataset C looks policy-sensitive and constrained.

## Screen 3: Inventory

### Why this screen matters

- For Dataset B, inventory should be shown before the dashboard.
- This makes the pain obvious before the recommendation is explained.

### Dataset B hero SKUs

- `Zara Winter Jacket`
- `Monte Carlo Sweater`

### Expected visual behavior

- high days of cover
- high ageing
- weak sell-through
- low ROAS

### Narrative

- “The season is ending and inventory is too high.”
- “The system is now managing time decay rather than demand generation.”

### What the audience should notice

- The inventory screen should immediately make the clearance case feel undeniable.

## Screen 4: Config

### What this screen is for

- It explains the guardrails behind the outputs.
- It shows that premium products are governed, not just scored.

### What to say

- “These thresholds protect margin and prevent reckless moves.”
- “The goal is not to win one metric. The goal is to keep the whole system safe.”

### What the audience should notice

- Governance is explicit.
- The system is rule-bounded and explainable.

## Screen 5: Research

### Simplified narrative

- “This screen helps us inspect how the orchestrator behaves across different commercial situations.”

### What to show

- Dataset A:
  - stable kurtas and selective pressure cases
- Dataset B:
  - seasonal jackets, sweaters, and hoodies
- Dataset C:
  - premium kurtas and sarees under governance pressure

### What the audience should notice

- The same commercial stories repeat in a structured way.
- The screen is a diagnostic lens, not the center of the demo.

## Screen 6: Recommendation Drilldown

### Preferred SKU

- `FabIndia Premium Silk Kurta`

### What to show in order

1. Pricing Agent
2. Advertising Agent
3. Inventory Agent
4. Seasonality Agent
5. Orchestrator
6. Final recommendation

### Story for the drilldown

- Advertising wants growth.
- Inventory says stock is limited.
- Governance wants caution.
- The orchestrator restrains expansion.

### What to say

- “Growth is attractive, but not at the expense of stock availability.”
- “This is where the architecture becomes visible to the audience.”

## Screen 7: Premium Saree Governance

### Preferred SKU

- `Biba Premium Silk Saree`

### Story

- Pricing wants markdown.
- Margin is already thin.
- Governance blocks destructive discounting.

### What to say

- “This is a premium product. Not every mathematically attractive action should be allowed.”
- “Governance prevents value destruction.”

## Screen 8: Activity

### What to show

- audit trail
- approvals
- overrides
- explainability

### What to say

- “The system leaves a trace of every important decision.”
- “That matters for committees, operators, and governance alike.”

### What the audience should notice

- The platform is not only deciding.
- It is also recording why it decided.

## Hero Sequence

Use this file for the final rapid walkthrough:
- `demo-datasets/hero_demo_sequence.csv`

### Step 1

- `FabIndia Cotton Kurta`
- Healthy business

### Step 2

- `FabIndia Indigo Kurta`
- Competitor pressure

### Step 3

- `Zara Winter Jacket`
- Season ending

### Step 4

- `Monte Carlo Sweater`
- Inventory crisis

### Step 5

- `Biba Premium Silk Saree`
- Governance override

## Closing Line

Most retailers optimize pricing and advertising separately.
Our framework coordinates pricing, advertising, inventory, seasonality, and governance through a shared orchestration layer.
Separate optimization destroys value.
Coordinated optimization protects margin, inventory, and advertising efficiency.

