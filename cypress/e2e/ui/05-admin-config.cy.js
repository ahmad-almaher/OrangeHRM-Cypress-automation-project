import Layout from '../../support/pages/Layout';
import { uniqueName } from '../../support/data';

describe('Admin - Job, Organization and Qualifications', { tags: '@admin' }, () => {
  beforeEach(() => cy.login());

  const adminPages = [
    ['Job', 'Job Titles', '/admin/viewJobTitleList', 'Job Titles'],
    ['Job', 'Pay Grades', '/admin/viewPayGrades', 'Pay Grades'],
    ['Job', 'Employment Status', '/admin/employmentStatus', 'Employment Status'],
    ['Job', 'Job Categories', '/admin/jobCategory', 'Job Categories'],
    ['Job', 'Work Shifts', '/admin/workShift', 'Work Shifts'],
    ['Organization', 'General Information', '/admin/viewOrganizationGeneralInformation', 'General Information'],
    ['Organization', 'Locations', '/admin/viewLocations', 'Locations'],
    ['Organization', 'Structure', '/admin/viewCompanyStructure', 'Organization Structure'],
    ['Qualifications', 'Skills', '/admin/viewSkills', 'Skills'],
    ['Qualifications', 'Education', '/admin/viewEducation', 'Education'],
    ['Qualifications', 'Licenses', '/admin/viewLicenses', 'Licenses'],
    ['Qualifications', 'Languages', '/admin/viewLanguages', 'Languages'],
    ['Qualifications', 'Memberships', '/admin/membership', 'Memberships'],
  ];

  adminPages.forEach(([tab, item, path, title]) => {
    it(`opens ${tab} > ${item} from the top bar`, () => {
      cy.visitApp('/admin/viewSystemUsers');
      Layout.openTopbar(tab, item);
      cy.url().should('include', path);
      cy.contains('h6, h5', title).should('be.visible');
    });
  });

  it('opens Nationalities from the top bar', () => {
    cy.visitApp('/admin/viewSystemUsers');
    Layout.openTopbar('Nationalities');
    cy.url().should('include', '/admin/nationality');
    cy.recordCount().should('be.greaterThan', 100);
  });

  describe('Job Titles CRUD', { tags: '@crud' }, () => {
    const title = uniqueName('Cypress QA');

    it('validates required job title', () => {
      cy.visitApp('/admin/saveJobTitle');
      cy.submitForm('Save');
      cy.field('Job Title').should('contain', 'Required');
    });

    it('rejects a duplicate job title', () => {
      cy.apiGet('/admin/job-titles', { limit: 1 }).then(({ body }) => {
        cy.visitApp('/admin/saveJobTitle');
        cy.field('Job Title').find('input').type(body.data[0].title);
        cy.field('Job Title').should('contain', 'Already exists');
      });
    });

    it('adds, edits and deletes a job title', () => {
      cy.visitApp('/admin/saveJobTitle');
      cy.field('Job Title').find('input').type(title);
      cy.field('Job Description').find('textarea').type('Created by Cypress');
      cy.field('Note').find('textarea').type('Automation note');
      cy.submitForm('Save');
      cy.expectToast('Successfully Saved');
      cy.url().should('include', '/admin/viewJobTitleList');

      cy.contains('.oxd-table-card', title).find('.bi-pencil-fill').click();
      cy.field('Job Title').find('input').should('have.value', title);
      cy.field('Job Description').find('textarea').clear().type('Updated by Cypress');
      cy.submitForm('Save');
      cy.expectToast('Successfully Updated');
      cy.contains('.oxd-table-card', title).should('contain', 'Updated by Cypress');

      cy.contains('.oxd-table-card', title).find('.bi-trash').click();
      cy.confirmDelete();
      cy.expectToast('Successfully Deleted');
      cy.contains('.oxd-table-card', title).should('not.exist');
    });
  });

  describe('Skills CRUD', { tags: '@crud' }, () => {
    it('adds and deletes a skill', () => {
      const skill = uniqueName('Cypress Skill');
      cy.visitApp('/admin/viewSkills');
      cy.contains('button', 'Add').click();
      cy.field('Name').find('input').type(skill);
      cy.field('Description').find('textarea').type('Automated skill');
      cy.submitForm('Save');
      cy.expectToast('Successfully Saved');
      cy.contains('.oxd-table-card', skill).find('.bi-trash').click();
      cy.confirmDelete();
      cy.expectToast('Successfully Deleted');
    });
  });

  describe('Locations', () => {
    it('searches locations by country', () => {
      cy.visitApp('/admin/viewLocations');
      cy.selectOption('Country', 'United States');
      cy.submitForm('Search');
      cy.get('.orangehrm-container').should('be.visible');
      cy.get('body').then(($b) => {
        if ($b.find('.oxd-table-card').length) {
          cy.tableRows().each(($r) => expect($r.text()).to.contain('United States'));
        }
      });
    });
  });

  describe('Organization General Information', () => {
    it('is read-only until Edit is toggled', () => {
      cy.visitApp('/admin/viewOrganizationGeneralInformation');
      cy.field('Organization Name').find('input').should('be.disabled');
      cy.get('.oxd-switch-input').click();
      cy.field('Organization Name').find('input').should('not.be.disabled');
    });
  });
});
