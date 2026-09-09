# P0 regression fixture (faf-mcp 3.0) — real Makefile targets so faf-cli's
# build-files interrogation has real command facts to find, independent of
# any package.json scripts.
.PHONY: test build lint

test:
	npm test && pytest service-py

build:
	npm run build

lint:
	npm run lint
