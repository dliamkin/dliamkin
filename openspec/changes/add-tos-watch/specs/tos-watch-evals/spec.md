## ADDED Requirements

### Requirement: Fixture-driven offline eval suite
The `tos-watch` eval suite SHALL run against hand-authored synthetic document pairs for a fictional service ("Acmecloud") written in authentic legalese, with planted changes: an added arbitration clause, a data-sharing expansion, a user-favorable refund-window extension (bias check), a liability cap change, and a cosmetic-only pair (renumbering + reworded-identical clauses). No live URLs are fetched during evals.

#### Scenario: Planted substantive changes are found
- **GIVEN** the arbitration/data-sharing/refund/liability fixture pairs
- **WHEN** the suite runs
- **THEN** each planted change is reported with the correct category and impact direction (including `favors_user` for the refund-window extension)

#### Scenario: Cosmetic pair gates as non-substantive
- **GIVEN** the cosmetic-only fixture pair
- **WHEN** the suite runs
- **THEN** the report has `substantive: false`

### Requirement: Deterministic output checks
The suite SHALL deterministically verify: every excerpt is ≤ 25 words; every excerpt appears verbatim in the fixture's new (or old, respectively) text (anti-fabrication containment); zero loaded-language violations; and the reported change count does not exceed the planted count (no invented changes).

#### Scenario: Fabricated excerpt fails containment
- **GIVEN** a report whose excerpt does not appear verbatim in the fixture text
- **WHEN** the containment check runs
- **THEN** the case fails

### Requirement: Dashboard and badge integration
The suite SHALL appear as `tos-watch` on the `/evals` dashboard via the existing eval framework, and the page SHALL carry its eval badge per house convention.

#### Scenario: Suite appears on the dashboard
- **WHEN** the evals workflow runs
- **THEN** `tos-watch` results are published alongside the existing suites and the badge reflects them

### Requirement: Offline unit tests for the fetch layer
The fetch/extract/normalize/hash layer SHALL have model-free unit tests, including volatile-fragment stripping: a fixture pair differing only in a "last updated" date MUST hash identically; excerpt truncation and the loaded-language scanner MUST demonstrably fire on adversarial fixture output.

#### Scenario: Adversarial output triggers both guards
- **GIVEN** a synthetic model output with a 40-word excerpt containing the word "sneakily"
- **WHEN** post-processing tests run
- **THEN** the truncation test and the loaded-language test both fail the output as expected
