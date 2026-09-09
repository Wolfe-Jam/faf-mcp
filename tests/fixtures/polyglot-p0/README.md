# polyglot-p0

A committed regression fixture for faf-mcp 3.0's P0 work: a real polyglot
repo (Node/TypeScript API + Python worker, Postgres + Redis via
docker-compose, a Makefile driving both test suites). Used to prove
`faf_auto` and `faf_score` report the identical score on the same file —
the headline bug fixed in faf-mcp 3.0.

## What this is for

Who: faf-mcp's own test suite.
What: a fixture project with real docker-compose services and Makefile
targets, so faf-cli's interrogation layer has real facts to find.
Why: prove `faf_auto`'s reported score can never again disagree with
`faf_score`'s on the same file.
Where: `tests/fixtures/polyglot-p0/`.
When: added for the 3.0 P0 regression suite.
How: copied into a temp directory per test run so `faf_auto` can write
into it without mutating the committed fixture.
