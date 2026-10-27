import Layout from '../../support/pages/Layout';
import { uniqueName } from '../../support/data';

describe('Time', { tags: '@time' }, () => {
  beforeEach(() => cy.login());

  it('shows Employee Timesheets', { tags: '@smoke' }, () => {
    cy.visitApp('/time/viewEmployeeTimesheet');
    cy.contains('h6', 'Select Employee').should('be.visible');
    cy.contains('h6', 'Timesheets Pending Action').should('be.visible');
  });

  it('requires an employee to view a timesheet', () => {
    cy.visitApp('/time/viewEmployeeTimesheet');
    cy.submitForm('View');
    cy.field('Employee Name').should('contain', 'Required');
  });

  it('shows My Timesheet', () => {
    cy.visitApp('/time/viewMyTimesheet');
    cy.contains('h6', 'My Timesheet').should('be.visible');
  });

  const pages = [
    ['Attendance', 'Employee Records', '/attendance/viewAttendanceRecord'],
    ['Attendance', 'Configuration', '/attendance/configure'],
    ['Reports', 'Project Reports', '/time/displayProjectReportCriteria'],
    ['Reports', 'Employee Reports', '/time/displayEmployeeReportCriteria'],
    ['Project Info', 'Customers', '/time/viewCustomers'],
    ['Project Info', 'Projects', '/time/viewProjects'],
  ];

  pages.forEach(([tab, item, path]) => {
    it(`opens ${tab} > ${item}`, () => {
      cy.visitApp('/time/viewEmployeeTimesheet');
      Layout.openTopbar(tab, item);
      cy.url().should('include', path);
    });
  });

  it('adds, rejects a duplicate of, and deletes a customer', { tags: '@crud' }, () => {
    const name = uniqueName('Cy Customer');
    cy.visitApp('/time/addCustomer');
    cy.field('Name').find('input').type(name);
    cy.field('Description').find('textarea').type('Automated customer');
    cy.submitForm('Save');
    cy.expectToast('Successfully Saved');

    cy.visitApp('/time/addCustomer');
    cy.field('Name').find('input').type(name);
    cy.field('Name').should('contain', 'Already exists');

    cy.visitApp('/time/viewCustomers');
    cy.contains('.oxd-table-card', name).find('.bi-trash').click();
    cy.confirmDelete();
    cy.expectToast('Successfully Deleted');
  });

  it('validates the Add Project form', () => {
    cy.visitApp('/time/saveProject');
    cy.submitForm('Save');
    cy.field('Name').should('contain', 'Required');
    cy.field('Customer Name').should('contain', 'Required');
  });
});
