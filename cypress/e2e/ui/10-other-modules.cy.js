import Layout from '../../support/pages/Layout';
import { newEmployee } from '../../support/data';

describe('My Info', { tags: '@myinfo' }, () => {
  beforeEach(() => {
    cy.login();
    // My Info's URL includes the user's employee number, so open it from the menu instead of a fixed URL
    cy.visitApp('/dashboard/index');
    Layout.goTo('My Info');
    cy.url().should('include', '/pim/viewPersonalDetails/empNumber/');
  });

  it("shows the logged-in user's personal details", { tags: '@smoke' }, () => {
    cy.get('.orangehrm-edit-employee-name h6').should('not.be.empty');
    cy.get('input[name="firstName"]').should('not.have.value', '');
    cy.contains('.orangehrm-tabs-item', 'Personal Details').should('have.class', '--active');
  });

  it('shows the profile picture', () => {
    cy.get('.orangehrm-edit-employee-image img').should('be.visible');
  });
});

describe('Change Password', { tags: '@auth' }, () => {
  // Never actually changes the shared demo Admin password
  beforeEach(() => {
    cy.login();
    // Cancel goes "back" in history, so arrive from the dashboard the way a user would
    cy.visitApp('/dashboard/index');
    Layout.openUserMenu().contains('Change Password').click();
    cy.url().should('include', '/pim/updatePassword');
  });

  it('requires all fields', () => {
    cy.submitForm('Save');
    cy.get('.oxd-input-field-error-message').should('have.length', 3);
  });

  it('rejects mismatched new passwords', () => {
    cy.field('Password').find('input').type('NewPassw0rd!');
    cy.field('Confirm Password').find('input').type('Mismatch99!');
    cy.field('Confirm Password').should('contain', 'Passwords do not match');
  });

  it('returns to the dashboard on Cancel', () => {
    cy.contains('button', 'Cancel').click();
    cy.url().should('include', '/dashboard/index');
  });
});

describe('Directory', { tags: '@directory' }, () => {
  let emp;
  let empNumber;

  before(() => {
    cy.login();
    emp = newEmployee();
    cy.createEmployee(emp).then((d) => (empNumber = d.empNumber));
  });

  after(() => {
    cy.login();
    cy.deleteEmployees([empNumber]);
  });

  beforeEach(() => {
    cy.login();
    cy.visitApp('/directory/viewDirectory');
  });

  it('shows employee cards', { tags: '@smoke' }, () => {
    cy.get('.orangehrm-directory-card').should('have.length.greaterThan', 0);
  });

  it('finds an employee by name', () => {
    cy.autocomplete('Employee Name', emp.lastName);
    cy.submitForm('Search');
    cy.get('.orangehrm-directory-card').should('have.length', 1).and('contain', emp.lastName);
  });

  it('resets the search', () => {
    cy.autocomplete('Employee Name', emp.lastName);
    cy.submitForm('Search');
    cy.get('.orangehrm-directory-card').should('have.length', 1);
    cy.contains('button', 'Reset').click();
    cy.get('.orangehrm-directory-card').should('have.length.greaterThan', 1);
  });
});

describe('Buzz', { tags: '@buzz' }, () => {
  beforeEach(() => {
    cy.login();
    cy.intercept('GET', '**/api/v2/buzz/feed?*').as('feed');
    cy.visitApp('/buzz/viewBuzz');
    cy.wait('@feed');
  });

  it('shows the feed and post composer', { tags: '@smoke' }, () => {
    cy.get('.oxd-buzz-post-input').should('be.visible');
    cy.get('.orangehrm-buzz-post').should('have.length.greaterThan', 0);
  });

  it('switches feed ordering tabs', () => {
    ['Most Liked Posts', 'Most Commented Posts', 'Most Recent Posts'].forEach((tab) => {
      cy.contains('.orangehrm-post-filters button', tab).click();
      cy.contains('.orangehrm-post-filters button', tab).should('have.class', 'oxd-button--label-warn');
    });
  });

  it('publishes and deletes a post', { tags: '@crud' }, () => {
    const msg = `Hello from Cypress ${Date.now()}`;
    // The feed re-renders once after load and wipes anything typed, so wait for the input to keep our text
    cy.get('.orangehrm-buzz-post').should('have.length.greaterThan', 0);
    cy.get('.oxd-buzz-post-input').clear().type(msg);
    cy.get('.oxd-buzz-post-input').should('have.value', msg);
    cy.intercept('POST', '**/api/v2/buzz/posts').as('createPost');
    cy.get('.oxd-buzz-post-slot button[type="submit"]').click();
    cy.wait('@createPost').its('response.statusCode').should('eq', 200);
    cy.contains(msg).should('be.visible').parents('.oxd-sheet').first().find('.bi-three-dots').click();
    cy.contains('Delete Post').click();
    cy.confirmDelete();
    cy.expectToast('Successfully Deleted');
    cy.contains(msg).should('not.exist');
  });
});

describe('Performance', { tags: '@performance' }, () => {
  beforeEach(() => cy.login());

  it('shows Employee Reviews', () => {
    cy.visitApp('/performance/searchEvaluatePerformanceReview');
    cy.contains('h5', 'Employee Reviews').should('be.visible');
  });

  it('lists KPIs via Configure', () => {
    cy.visitApp('/performance/searchEvaluatePerformanceReview');
    Layout.openTopbar('Configure', 'KPIs');
    cy.url().should('include', '/performance/searchKpi');
    cy.recordCount().should('be.greaterThan', 0);
  });

  it('opens My Trackers', () => {
    cy.visitApp('/performance/searchEvaluatePerformanceReview');
    Layout.openTopbar('My Trackers');
    cy.url().should('include', '/performance/viewMyPerformanceTrackerList');
  });
});

describe('Claim', { tags: '@claim' }, () => {
  beforeEach(() => cy.login());

  it('shows Employee Claims', () => {
    cy.visitApp('/claim/viewAssignClaim');
    cy.contains('h5', 'Employee Claims').should('be.visible');
  });

  it('lists claim events via Configuration', () => {
    cy.visitApp('/claim/viewAssignClaim');
    Layout.openTopbar('Configuration', 'Events');
    cy.url().should('include', '/claim/viewEvents');
  });

  it('validates the Submit Claim form', () => {
    cy.visitApp('/claim/submitClaim');
    cy.submitForm('Create');
    cy.field('Event').should('contain', 'Required');
    cy.field('Currency').should('contain', 'Required');
  });
});

describe('Maintenance', { tags: '@maintenance' }, () => {
  beforeEach(() => cy.login());

  it('asks for administrator re-authentication', () => {
    cy.visit('/web/index.php/maintenance/purgeEmployee');
    cy.contains('Administrator Access').should('be.visible');
    cy.get('input[name="username"]').should('be.disabled');
    cy.contains('button', 'Cancel').click();
    cy.url().should('not.include', '/maintenance');
  });
});
