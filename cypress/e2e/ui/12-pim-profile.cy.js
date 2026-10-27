import Layout from '../../support/pages/Layout';
import { newEmployee, uniqueName } from '../../support/data';

describe('PIM - Employee profile sections', { tags: '@pim' }, () => {
  const created = [];
  let emp;
  let empNumber;

  beforeEach(() => {
    cy.login();
    emp = newEmployee();
    cy.createEmployee(emp).then((data) => {
      empNumber = data.empNumber;
      created.push(empNumber);
    });
  });

  after(() => {
    cy.login();
    cy.deleteEmployees(created);
  });

  it('updates job details', { tags: '@crud' }, () => {
    cy.apiGet('/admin/job-titles', { limit: 1 }).then(({ body }) => {
      const jobTitle = body.data[0].title;
      cy.visitApp(`/pim/viewJobDetails/empNumber/${empNumber}`);
      cy.selectOption('Job Title', jobTitle);
      cy.get('.orangehrm-card-container').first().within(() => cy.submitForm('Save'));
      cy.expectToast('Successfully Updated');
      cy.reload();
      cy.field('Job Title').should('contain', jobTitle);
    });
  });

  it('adds and deletes a salary component', { tags: '@crud' }, () => {
    cy.visitApp(`/pim/viewSalaryList/empNumber/${empNumber}`);
    cy.contains('.orangehrm-action-header', 'Assigned Salary Components').find('button').click();
    cy.submitForm('Save');
    cy.field('Salary Component').should('contain', 'Required');
    cy.field('Currency').should('contain', 'Required');

    cy.field('Salary Component').find('input').type('Base Pay');
    cy.selectOption('Pay Frequency', 'Monthly');
    cy.selectOption('Currency', 'United States Dollar');
    cy.field('Amount').find('input').type('4200');
    cy.submitForm('Save');
    cy.expectToast('Successfully Saved');
    cy.contains('.oxd-table-card', 'Base Pay').should('contain', '4200').find('.bi-trash').click();
    cy.confirmDelete();
    cy.expectToast('Successfully Deleted');
  });

  it('adds a passport immigration record', { tags: '@crud' }, () => {
    cy.visitApp(`/pim/viewImmigration/empNumber/${empNumber}`);
    cy.contains('.orangehrm-action-header', 'Assigned Immigration Records').find('button').click();
    cy.submitForm('Save');
    cy.field('Number').should('contain', 'Required');
    cy.contains('label', 'Passport').click();
    cy.field('Number').find('input').type('P1234567');
    cy.submitForm('Save');
    cy.expectToast('Successfully Saved');
    cy.contains('.oxd-table-card', 'P1234567').should('contain', 'Passport');
  });

  it('adds work experience under Qualifications', { tags: '@crud' }, () => {
    cy.visitApp(`/pim/viewQualifications/empNumber/${empNumber}`);
    cy.contains('.orangehrm-action-header', 'Work Experience').find('button').click();
    cy.field('Company').find('input').type('Acme Corp');
    cy.field('Job Title').find('input').type('QA Engineer');
    cy.submitForm('Save');
    cy.expectToast('Successfully Saved');
    cy.contains('.oxd-table-card', 'Acme Corp').should('contain', 'QA Engineer');
  });

  it('assigns a supervisor in Report-to', { tags: '@crud' }, () => {
    const boss = newEmployee();
    cy.createEmployee(boss).then(({ empNumber: n }) => created.push(n));
    cy.visitApp(`/pim/viewReportToDetails/empNumber/${empNumber}`);
    cy.contains('.orangehrm-action-header', 'Assigned Supervisors').find('button').click();
    cy.autocomplete('Name', boss.lastName);
    cy.selectOption('Reporting Method', 'Direct');
    cy.submitForm('Save');
    cy.expectToast('Successfully Saved');
    cy.contains('.oxd-table-card', boss.lastName).should('contain', 'Direct');
  });

  it('resets an employee list search back to all records', () => {
    cy.visitApp('/pim/viewEmployeeList');
    cy.field('Employee Id').find('input').type(emp.employeeId);
    cy.submitForm('Search');
    cy.tableRows().should('have.length', 1);
    cy.contains('button', 'Reset').click();
    cy.field('Employee Id').find('input').should('have.value', '');
    cy.recordCount().should('be.greaterThan', 1);
  });
});

describe('PIM - Configuration', { tags: '@pim' }, () => {
  beforeEach(() => cy.login());

  const configPages = [
    ['Optional Fields', '/pim/configurePim'],
    ['Custom Fields', '/pim/listCustomFields'],
    ['Data Import', '/pim/pimCsvImport'],
    ['Reporting Methods', '/pim/viewReportingMethods'],
    ['Termination Reasons', '/pim/viewTerminationReasons'],
  ];

  configPages.forEach(([item, path]) => {
    it(`opens Configuration > ${item}`, () => {
      cy.visitApp('/pim/viewEmployeeList');
      Layout.openTopbar('Configuration', item);
      cy.url().should('include', path);
    });
  });

  it('downloads the CSV import template link', () => {
    cy.visitApp('/pim/pimCsvImport');
    // The link is a JavaScript download (href="#"), so click it and check the CSV lands in the downloads folder
    cy.task('clearDownloads');
    cy.contains('a.download-link', 'Download').should('be.visible').click();
    // cy.readFile retries until the file exists, unlike cy.task
    cy.readFile('cypress/downloads/importData.csv', { timeout: 20000 }).should('include', 'first_name');
  });

  it('adds, rejects a duplicate of and deletes a termination reason', { tags: '@crud' }, () => {
    const name = uniqueName('Cy Reason');
    cy.visitApp('/pim/viewTerminationReasons');
    cy.contains('button', 'Add').click();
    cy.field('Name').find('input').type(name);
    cy.submitForm('Save');
    cy.expectToast('Successfully Saved');

    cy.contains('button', 'Add').click();
    cy.field('Name').find('input').type(name);
    cy.field('Name').should('contain', 'Already exists');
    cy.contains('button', 'Cancel').click();

    cy.contains('.oxd-table-card', name).find('.bi-trash').click();
    cy.confirmDelete();
    cy.expectToast('Successfully Deleted');
  });

  it('adds and deletes a reporting method', { tags: '@crud' }, () => {
    const name = uniqueName('Cy Method');
    cy.visitApp('/pim/viewReportingMethods');
    cy.contains('button', 'Add').click();
    cy.field('Name').find('input').type(name);
    cy.submitForm('Save');
    cy.expectToast('Successfully Saved');
    cy.contains('.oxd-table-card', name).find('.bi-trash').click();
    cy.confirmDelete();
    cy.expectToast('Successfully Deleted');
  });

  it('validates the custom field form', () => {
    cy.visitApp('/pim/listCustomFields');
    cy.contains('button', 'Add').click();
    cy.submitForm('Save');
    cy.field('Field Name').should('contain', 'Required');
    cy.field('Screen').should('contain', 'Required');
    cy.field('Type').should('contain', 'Required');
  });

  it('searches employee reports by name', () => {
    cy.visitApp('/pim/viewDefinedPredefinedReports');
    cy.autocomplete('Report Name', 'Employee', 'Employee Contact info report');
    cy.submitForm('Search');
    cy.tableRows().should('have.length', 1).and('contain', 'Employee Contact info report');
  });
});
