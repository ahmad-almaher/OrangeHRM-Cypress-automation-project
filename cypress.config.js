const fs = require('fs');
const path = require('path');
const { defineConfig } = require('cypress');
const { beforeRunHook, afterRunHook } = require('cypress-mochawesome-reporter/lib');
const { enhanceReport } = require('./scripts/enhance-report');

const downloadsDir = path.join(__dirname, 'cypress', 'downloads');

module.exports = defineConfig({
  // Single self-contained HTML report with charts and embedded failure screenshots
  reporter: 'cypress-mochawesome-reporter',
  reporterOptions: {
    reportDir: 'cypress/reports',
    reportPageTitle: 'OrangeHRM Test Report',
    charts: true,
    embeddedScreenshots: true,
    inlineAssets: true,
    saveAllAttempts: false,
  },
  e2e: {
    baseUrl: 'https://opensource-demo.orangehrmlive.com',
    specPattern: 'cypress/e2e/**/*.cy.js',
    viewportWidth: 1440,
    viewportHeight: 900,
    defaultCommandTimeout: 15000,
    pageLoadTimeout: 60000,
    requestTimeout: 20000,
    video: false,
    screenshotOnRunFailure: true,
    // The public demo is shared and occasionally slow, so retry in headless runs only
    retries: { runMode: 2, openMode: 0 },
    env: {
      apiPath: '/web/index.php/api/v2',
      grepOmitFiltered: true,
    },
    setupNodeEvents(on, config) {
      // Generate the mochawesome report, then add the summary and filter dashboard on top of it
      on('before:run', async (details) => {
        await beforeRunHook(details);
      });
      on('after:run', async (results) => {
        await afterRunHook(results);
        enhanceReport(path.join(__dirname, 'cypress', 'reports', 'index.html'));
      });

      on('task', {
        clearDownloads() {
          fs.rmSync(downloadsDir, { recursive: true, force: true });
          return null;
        },
      });
      require('@cypress/grep/src/plugin')(config);
      return config;
    },
  },
});
