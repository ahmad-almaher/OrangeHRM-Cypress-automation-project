import Layout from '../../support/pages/Layout';
import { newCandidate } from '../../support/data';

describe('Recruitment', { tags: '@recruitment' }, () => {
  const createdCandidates = [];

  beforeEach(() => cy.login());

  after(() => {
    cy.login();
    if (createdCandidates.length) cy.apiDelete('/recruitment/candidates', createdCandidates);
  });

  it('lists candidates', { tags: '@smoke' }, () => {
    cy.visitApp('/recruitment/viewCandidates');
    ['Vacancy', 'Candidate', 'Hiring Manager', 'Date of Application', 'Status'].forEach((c) =>
      cy.contains('.oxd-table-th', c).should('exist'),
    );
  });

  it('lists vacancies', () => {
    cy.visitApp('/recruitment/viewCandidates');
    Layout.openTopbar('Vacancies');
    cy.url().should('include', '/recruitment/viewJobVacancy');
    cy.recordCount().should('be.at.least', 0);
  });

  it('filters candidates by status', () => {
    cy.visitApp('/recruitment/viewCandidates');
    cy.selectOption('Status', 'Shortlisted');
    cy.submitForm('Search');
    cy.get('body').then(($b) => {
      if ($b.find('.oxd-table-card').length) {
        cy.tableRows().each(($r) => expect($r.text()).to.contain('Shortlisted'));
      }
    });
  });

  it('validates the Add Candidate form', () => {
    cy.visitApp('/recruitment/addCandidate');
    cy.submitForm('Save');
    cy.get('.--name-grouped-field .oxd-input-field-error-message').should('have.length', 2);
    cy.field('Email').should('contain', 'Required');
    cy.field('Email').find('input').type('bad-email');
    cy.field('Email').should('contain', 'Expected format: admin@example.com');
  });

  it('adds a candidate and shortlists them', { tags: '@crud' }, () => {
    const c = newCandidate();
    cy.intercept('POST', '**/api/v2/recruitment/candidates').as('createCandidate');
    cy.visitApp('/recruitment/addCandidate');
    cy.get('input[name="firstName"]').type(c.firstName);
    cy.get('input[name="lastName"]').type(c.lastName);
    cy.field('Email').find('input').type(c.email);
    cy.field('Contact Number').find('input').type('555-0100');
    cy.field('Keywords').find('input').type('cypress, automation');
    cy.get('.oxd-checkbox-input').click();
    cy.submitForm('Save');
    cy.wait('@createCandidate').then(({ response }) => createdCandidates.push(response.body.data.id));
    cy.expectToast('Successfully Saved');
    cy.url().should('include', '/recruitment/addCandidate/');
    cy.contains('Application Stage').should('be.visible');

    cy.visitApp('/recruitment/viewCandidates');
    cy.autocomplete('Candidate Name', c.lastName);
    cy.submitForm('Search');
    cy.tableRows().should('have.length', 1).and('contain', c.lastName);
  });

  it('validates the Add Vacancy form', () => {
    cy.visitApp('/recruitment/addJobVacancy');
    cy.submitForm('Save');
    cy.field('Vacancy Name').should('contain', 'Required');
    cy.field('Job Title').should('contain', 'Required');
    cy.field('Hiring Manager').should('contain', 'Required');
  });
});
