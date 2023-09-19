import { defineConfig } from 'cypress';
import fs from 'fs';

import plugins from './cypress/plugins/index';

export default defineConfig({
  video: false,
  projectId: 'p5zxx6',
  viewportWidth: 1200,
  viewportHeight: 950,
  fixturesFolder: 'test/cypress/fixtures',
  screenshotsFolder: 'test/cypress/screenshots',
  videosFolder: 'test/cypress/videos',
  defaultCommandTimeout: 5000,
  pageLoadTimeout: 90000,
  numTestsKeptInMemory: 5,
  retries: {
    runMode: 2,
    openMode: 0,
  },
  e2e: {
    baseUrl: 'http://localhost:8888/#',
    experimentalRunAllSpecs: true,
    supportFile: 'test/cypress/support/index.ts',
    specPattern: 'test/cypress/e2e/**/*.cy.{js,ts}',
    testIsolation: false,
    setupNodeEvents(on, config) {
      on('task', {
        updateListOfTests() {
          const UPDATE_TESTS_LIST_CY_TS = '000-update-tests-list.cy.ts';
          const RUN_ALL_TESTS_CY_TS = '000-run-all-specs.cy.ts';
          const PATHNAME_OF_RUN_ALL_TESTS_CY_TS = './cypress/e2e/' + RUN_ALL_TESTS_CY_TS;

          const testsOnDisk = fs
            .readdirSync('./cypress/e2e/')
            .filter(filename => filename.endsWith('.cy.ts'))
            .filter(filename => ![UPDATE_TESTS_LIST_CY_TS, RUN_ALL_TESTS_CY_TS].includes(filename));

          const scriptImportingAllTests =
            `// This script was autogenerated by ${UPDATE_TESTS_LIST_CY_TS}\n` +
            testsOnDisk.map(test => `import './${test}';`).join('\n');
          fs.writeFileSync(PATHNAME_OF_RUN_ALL_TESTS_CY_TS, scriptImportingAllTests);
          return true;
        },
      });
      return plugins(on, config);
    },
  },
});