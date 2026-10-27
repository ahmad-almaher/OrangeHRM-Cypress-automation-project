import registerCypressGrep from '@cypress/grep/src/support';
import 'cypress-mochawesome-reporter/register';
import './commands';

registerCypressGrep();

// The demo app sometimes throws unhandled Vue/axios errors that are unrelated to the test under way
Cypress.on('uncaught:exception', () => false);
