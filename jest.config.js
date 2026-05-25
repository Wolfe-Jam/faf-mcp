module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  // Perf tests run via npm run test:performance (continue-on-error in CI).
  // Hard timing assertions on shared CI runners are flaky by nature, so they
  // do NOT gate the main test run — observability, not a gate.
  testPathIgnorePatterns: ['/node_modules/', 'performance.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  // Tests run in-band (package.json `test` → `jest --runInBand`). These MCP
  // suites are small; serial execution removes Jest's worker pool — the source
  // of the intermittent "worker failed to exit gracefully" red on constrained
  // Windows/macOS CI runners (a worker missing its shutdown window, blaming
  // whichever suite finalized last). In-band is deterministic and exits clean
  // on its own: --detectOpenHandles reports ZERO open handles, so no forceExit
  // is needed (and forceExit was suppressing that very diagnostic).
};
