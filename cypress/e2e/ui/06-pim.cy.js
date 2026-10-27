import Layout from '../../support/pages/Layout';
import { newEmployee, newUsername, strongPassword } from '../../support/data';

describe('PIM - Employees', { tags: '@pim' }, () => {
  const created = [];

  beforeEach(() => cy.login());

  after(() => {
    cy.login();
    cy.deleteEmployees(created);
  });

  describe('Employee list', () => {
    beforeEach(() => cy.visitApp('/pim/viewEmployeeList'));

    it('shows the employee list with records', { tags: '@smoke' }, () => {
      cy.contains('h5', 'Employee Information').should('be.visible');
      ['Id', 'First (& Middle) Name', 'Last Name', 'Job Title', 'Employment Status', 'Sub Unit', 'Supervisor'].forEach(
        (col) => cy.contains('.oxd-table-th', col).should('exist'),
      );
      cy.recordCount().should('be.greaterThan', 0);
    });

    it('searches by employee id', () => {
      const emp = newEmployee();
      cy.createEmployee(emp).then(({ empNumber }) => created.push(empNumber));
      cy.field('Employee Id').find('input').type(emp.employeeId);
      cy.submitForm('Search');
      cy.tableRows().should('have.length', 1).and('contain', emp.lastName);
    });

    it('searches by employee name via autocomplete', () => {
      const emp = newEmployee();
      cy.createEmployee(emp).then(({ empNumber }) => created.push(empNumber));
      cy.autocomplete('Employee Name', emp.lastName);
      cy.submitForm('Search');
      cy.tableRows().should('have.length', 1).and('contain', emp.firstName);
    });

    it('shows "No Records Found" for an unknown id', () => {
      cy.field('Employee Id').find('input').type('ZZ_NOPE_99');
      cy.submitForm('Search');
      cy.expectToast('No Records Found');
    });

    it('filters by employment status', () => {
      cy.selectOption('Employment Status', 'Full-Time Permanent');
      cy.submitForm('Search');
      cy.get('body').then(($b) => {
        if ($b.find('.oxd-table-card').length) {
          cy.tableRows().each(($r) => expect($r.text()).to.contain('Full-Time Permanent'));
        }
      });
    });

    it('paginates when there is more than one page', () => {
      cy.get('body').then(($b) => {
        if ($b.find('.oxd-pagination-page-item--page').length > 1) {
          cy.contains('.oxd-pagination-page-item--page', '2').click();
          cy.contains('.oxd-pagination-page-item--page', '2').should('have.class', 'oxd-pagination-page-item--page-selected');
        }
      });
    });

    it('opens Reports from the top bar', () => {
      Layout.openTopbar('Reports');
      cy.url().should('include', '/pim/viewDefinedPredefinedReports');
      cy.contains('h5', 'Employee Reports').should('be.visible');
    });
  });

  describe('Add employee', () => {
    beforeEach(() => cy.visitApp('/pim/addEmployee'));

    it('requires first and last name', () => {
      cy.get('input[name="firstName"]').clear();
      cy.submitForm('Save');
      cy.get('.--name-grouped-field .oxd-input-field-error-message').should('have.length', 2);
    });

    it('adds an employee and opens Personal Details', { tags: ['@smoke', '@crud'] }, () => {
      const emp = newEmployee();
      cy.get('input[name="firstName"]').type(emp.firstName);
      cy.get('input[name="middleName"]').type('Q');
      cy.get('input[name="lastName"]').type(emp.lastName);
      cy.field('Employee Id').find('input').clear().type(emp.employeeId);
      cy.submitForm('Save');
      cy.expectToast('Successfully Saved');
      cy.url().should('match', /\/pim\/viewPersonalDetails\/empNumber\/(\d+)/).then((url) => {
        created.push(Number(url.match(/empNumber\/(\d+)/)[1]));
      });
      cy.get('.orangehrm-edit-employee-name').should('contain', `${emp.firstName} ${emp.lastName}`);
    });

    it('adds an employee with login details', { tags: '@crud' }, () => {
      const emp = newEmployee();
      const username = newUsername();
      const password = strongPassword();
      cy.get('input[name="firstName"]').type(emp.firstName);
      cy.get('input[name="lastName"]').type(emp.lastName);
      cy.field('Employee Id').find('input').clear().type(emp.employeeId);
      cy.get('.oxd-switch-input').click();
      cy.field('Username').find('input').type(username);
      cy.field('Password').find('input').type(password, { log: false });
      cy.field('Confirm Password').find('input').type(password, { log: false });
      cy.submitForm('Save');
      cy.expectToast('Successfully Saved');
      cy.url().should('include', '/pim/viewPersonalDetails/empNumber/').then((url) => {
        created.push(Number(url.match(/empNumber\/(\d+)/)[1]));
      });
      cy.apiGet('/admin/users', { username }).its('body.meta.total').should('eq', 1);
    });

    it('rejects a duplicate employee id', () => {
      const emp = newEmployee();
      cy.createEmployee(emp).then(({ empNumber }) => created.push(empNumber));
      cy.field('Employee Id').find('input').clear().type(emp.employeeId);
      cy.field('Employee Id').should('contain', 'Employee Id already exists');
    });
  });

  describe('Employee profile', () => {
    let emp;
    let empNumber;

    beforeEach(() => {
      emp = newEmployee();
      cy.createEmployee(emp).then((data) => {
        empNumber = data.empNumber;
        created.push(empNumber);
      });
    });

    it('edits personal details', { tags: '@crud' }, () => {
      cy.visitApp(`/pim/viewPersonalDetails/empNumber/${empNumber}`);
      cy.get('input[name="lastName"]').should('have.value', emp.lastName);
      cy.field("Driver's License Number").find('input').type('DL-12345');
      cy.selectOption('Nationality', 'American');
      cy.selectOption('Marital Status', 'Single');
      cy.contains('label', 'Male').click();
      cy.get('.orangehrm-card-container').first().within(() => cy.submitForm('Save'));
      cy.expectToast('Successfully Updated');
      cy.reload();
      cy.field("Driver's License Number").find('input').should('have.value', 'DL-12345');
      cy.field('Nationality').should('contain', 'American');
    });

    it('navigates all profile tabs', () => {
      cy.visitApp(`/pim/viewPersonalDetails/empNumber/${empNumber}`);
      const tabs = [
        ['Contact Details', 'contactDetails'],
        ['Emergency Contacts', 'viewEmergencyContacts'],
        ['Dependents', 'viewDependents'],
        ['Immigration', 'viewImmigration'],
        ['Job', 'viewJobDetails'],
        ['Salary', 'viewSalaryList'],
        ['Report-to', 'viewReportToDetails'],
        ['Qualifications', 'viewQualifications'],
        ['Memberships', 'viewMemberships'],
        ['Personal Details', 'viewPersonalDetails'],
      ];
      tabs.forEach(([label, path]) => {
        cy.contains('.orangehrm-tabs-item', label).click();
        cy.url().should('include', path);
        cy.contains('.orangehrm-tabs-item', label).should('have.class', '--active');
      });
    });

    it('updates contact details with email validation', () => {
      cy.visitApp(`/pim/contactDetails/empNumber/${empNumber}`);
      cy.field('Work Email').find('input').type('not-an-email');
      cy.field('Work Email').should('contain', 'Expected format: admin@example.com');
      cy.field('Work Email').find('input').clear().type(`${emp.employeeId.toLowerCase()}@example.com`);
      cy.field('Mobile').find('input').type('5551234567');
      cy.submitForm('Save');
      cy.expectToast('Successfully Updated');
    });

    it('adds and removes an emergency contact', { tags: '@crud' }, () => {
      cy.visitApp(`/pim/viewEmergencyContacts/empNumber/${empNumber}`);
      cy.contains('.orangehrm-action-header', 'Assigned Emergency Contacts').find('button').click();
      cy.field('Name').find('input').type('Jane Contact');
      cy.field('Relationship').find('input').type('Sister');
      cy.field('Mobile').find('input').type('5550001111');
      cy.submitForm('Save');
      cy.expectToast('Successfully Saved');
      cy.contains('.oxd-table-card', 'Jane Contact').find('.bi-trash').click();
      cy.confirmDelete();
      cy.expectToast('Successfully Deleted');
    });

    it('adds a dependent', { tags: '@crud' }, () => {
      cy.visitApp(`/pim/viewDependents/empNumber/${empNumber}`);
      cy.contains('.orangehrm-action-header', 'Assigned Dependents').find('button').click();
      cy.field('Name').find('input').type('Kid Cypress');
      cy.selectOption('Relationship', 'Child');
      cy.submitForm('Save');
      cy.expectToast('Successfully Saved');
      cy.contains('.oxd-table-card', 'Kid Cypress').should('contain', 'Child');
    });

    it('deletes an employee from the list', { tags: '@crud' }, () => {
      cy.visitApp('/pim/viewEmployeeList');
      cy.field('Employee Id').find('input').type(emp.employeeId);
      cy.submitForm('Search');
      cy.tableRows().should('have.length', 1).find('.bi-trash').click();
      cy.confirmDelete();
      cy.expectToast('Successfully Deleted');
      cy.field('Employee Id').find('input').clear().type(emp.employeeId);
      cy.submitForm('Search');
      cy.tableRows().should('not.exist');
    });
  });
});
