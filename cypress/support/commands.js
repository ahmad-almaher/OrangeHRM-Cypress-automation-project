const api = (path) => `${Cypress.env('apiPath')}${path}`;

/** Log in through the UI once per user and cache the session across specs. */
Cypress.Commands.add('login', (username, password) => {
  cy.fixture('users').then(({ admin }) => {
    const user = username || admin.username;
    const pass = password || admin.password;
    cy.session(
      [user, pass],
      () => {
        cy.visit('/web/index.php/auth/login');
        cy.get('input[name="username"]').type(user);
        cy.get('input[name="password"]').type(pass, { log: false });
        cy.get('button[type="submit"]').click();
        cy.url().should('include', '/dashboard/index');
      },
      {
        cacheAcrossSpecs: true,
        validate() {
          cy.request({ url: api('/dashboard/employees/locations'), failOnStatusCode: false })
            .its('status')
            .should('eq', 200);
        },
      },
    );
  });
});

/** Visit an app route, e.g. cy.visitApp('/pim/viewEmployeeList'). */
Cypress.Commands.add('visitApp', (path) => {
  cy.visit(`/web/index.php${path}`);
  cy.get('.oxd-layout-context', { timeout: 30000 }).should('be.visible');
  cy.get('.oxd-form-loader', { timeout: 30000 }).should('not.exist');
});

Cypress.Commands.add('pageHeader', () => cy.get('.oxd-topbar-header-breadcrumb'));

/** Find the input group whose label matches, e.g. cy.field('Username'). */
Cypress.Commands.add('field', (label) =>
  cy
    .contains('.oxd-input-group label', new RegExp(`^${Cypress._.escapeRegExp(label)}$`))
    .parents('.oxd-input-group')
    .first(),
);

/** Pick an option from an OrangeHRM custom select located by its label. */
Cypress.Commands.add('selectOption', (label, option) => {
  cy.field(label).find('.oxd-select-text').click();
  cy.get('.oxd-select-dropdown').contains('.oxd-select-option', option).click();
});

/** Type into an autocomplete field and pick the first suggestion matching the text. */
Cypress.Commands.add('autocomplete', (label, text, pick) => {
  cy.field(label).find('input').clear().type(text);
  cy.get('.oxd-autocomplete-dropdown').should('not.contain', 'Searching');
  cy.get('.oxd-autocomplete-dropdown .oxd-autocomplete-option')
    .contains(pick || text)
    .click();
});

Cypress.Commands.add('submitForm', (label = 'Save') => {
  cy.contains('button[type="submit"]', label).click();
});

// Several toasts can stack (e.g. "No Records Found" from a child list), so look for the one with our text
Cypress.Commands.add('expectToast', (text = 'Success') => {
  cy.contains('.oxd-toast', text, { timeout: 20000 }).should('be.visible');
});

/**
 * Click Search and wait for the list API to answer, so assertions never run against the stale table.
 * apiPath is the list endpoint, e.g. '/admin/users'.
 */
Cypress.Commands.add('searchAndWait', (apiPath) => {
  cy.intercept('GET', `**${Cypress.env('apiPath')}${apiPath}?*`).as('listRefresh');
  cy.submitForm('Search');
  cy.wait('@listRefresh');
});

/**
 * Type an ISO date (YYYY-MM-DD) into a date field in whatever format the instance is configured for.
 * The demo uses yyyy-dd-mm, which is read from the input's placeholder.
 */
Cypress.Commands.add('typeDate', (label, iso) => {
  const [y, m, d] = iso.split('-');
  cy.field(label)
    .find('input')
    .then(($input) => {
      const format = ($input.attr('placeholder') || 'yyyy-mm-dd').toLowerCase();
      const value = format.replace('yyyy', y).replace('mm', m).replace('dd', d);
      cy.wrap($input).clear().type(value).blur();
    });
});

Cypress.Commands.add('tableRows', () => cy.get('.oxd-table-body .oxd-table-card'));

/** Returns the number in the "(N) Records Found" label (0 for "No Records Found"). */
Cypress.Commands.add('recordCount', () =>
  cy.get('.orangehrm-horizontal-padding .oxd-text--span').first().invoke('text').then((t) => {
    const m = t.match(/\((\d+)\)/);
    return m ? Number(m[1]) : 0;
  }),
);

Cypress.Commands.add('confirmDelete', () => {
  cy.get('.oxd-dialog-sheet').should('be.visible');
  cy.contains('.oxd-dialog-sheet button', 'Yes, Delete').click();
});

// ---------- API helpers (reuse the logged-in browser session cookie) ----------

Cypress.Commands.add('apiGet', (path, qs = {}) =>
  cy.request({ method: 'GET', url: api(path), qs, failOnStatusCode: false }),
);

Cypress.Commands.add('apiPost', (path, body) =>
  cy.request({ method: 'POST', url: api(path), body, failOnStatusCode: false }),
);

Cypress.Commands.add('apiPut', (path, body) =>
  cy.request({ method: 'PUT', url: api(path), body, failOnStatusCode: false }),
);

Cypress.Commands.add('apiDelete', (path, ids) =>
  cy.request({ method: 'DELETE', url: api(path), body: { ids }, failOnStatusCode: false }),
);

Cypress.Commands.add('createEmployee', (employee) =>
  cy.apiPost('/pim/employees', employee).then((res) => {
    expect(res.status).to.eq(200);
    return res.body.data;
  }),
);

Cypress.Commands.add('deleteEmployees', (empNumbers) => {
  if (empNumbers.length) cy.apiDelete('/pim/employees', empNumbers);
});
