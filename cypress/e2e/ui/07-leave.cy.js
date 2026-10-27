import Layout from '../../support/pages/Layout';
import { uniqueName } from '../../support/data';

describe('Leave', { tags: '@leave' }, () => {
  beforeEach(() => cy.login());

  it('shows the leave list with date and status filters', { tags: '@smoke' }, () => {
    cy.visitApp('/leave/viewLeaveList');
    cy.contains('h5', 'Leave List').should('be.visible');
    ['From Date', 'To Date', 'Show Leave with Status', 'Leave Type', 'Employee Name', 'Sub Unit'].forEach((l) =>
      cy.field(l).should('exist'),
    );
  });

  it('requires a status when filtering the leave list', () => {
    cy.visitApp('/leave/viewLeaveList');
    cy.contains('.oxd-chip', 'Pending Approval').find('i').click();
    cy.get('.oxd-chip').should('not.exist');
    cy.submitForm('Search');
    cy.field('Show Leave with Status').should('contain', 'Required');
  });

  it('rejects a To Date before the From Date', () => {
    cy.visitApp('/leave/viewLeaveList');
    cy.typeDate('From Date', '2026-12-31');
    cy.typeDate('To Date', '2026-01-01');
    cy.contains('h5', 'Leave List').click();
    cy.field('To Date').should('contain', 'To date should be after from date');
  });

  it('validates the Assign Leave form', () => {
    cy.visitApp('/leave/assignLeave');
    cy.submitForm('Assign');
    cy.field('Employee Name').should('contain', 'Required');
    cy.field('Leave Type').should('contain', 'Required');
  });

  it('opens Apply Leave', () => {
    cy.visitApp('/leave/applyLeave');
    cy.contains('h6', 'Apply Leave').should('be.visible');
  });

  it('opens My Leave', () => {
    cy.visitApp('/leave/viewMyLeaveList');
    cy.contains('h5', 'My Leave List').should('be.visible');
  });

  const configPages = [
    ['Leave Period', '/leave/defineLeavePeriod'],
    ['Leave Types', '/leave/leaveTypeList'],
    ['Work Week', '/leave/defineWorkWeek'],
    ['Holidays', '/leave/viewHolidayList'],
  ];

  configPages.forEach(([item, path]) => {
    it(`opens Configure > ${item}`, () => {
      cy.visitApp('/leave/viewLeaveList');
      Layout.openTopbar('Configure', item);
      cy.url().should('include', path);
    });
  });

  it('opens Entitlements > Employee Entitlements', () => {
    cy.visitApp('/leave/viewLeaveList');
    Layout.openTopbar('Entitlements', 'Employee Entitlements');
    cy.url().should('include', '/leave/viewLeaveEntitlements');
  });

  it('adds and deletes a leave type', { tags: '@crud' }, () => {
    const name = uniqueName('Cy Leave');
    cy.visitApp('/leave/defineLeaveType');
    cy.field('Name').find('input').type(name);
    cy.contains('label', 'No').click();
    cy.submitForm('Save');
    cy.expectToast('Successfully Saved');
    cy.url().should('include', '/leave/leaveTypeList');
    cy.contains('.oxd-table-card', name).find('.bi-trash').click();
    cy.confirmDelete();
    cy.expectToast('Successfully Deleted');
  });

  it('adds and deletes a holiday', { tags: '@crud' }, () => {
    const name = uniqueName('Cy Holiday');
    // Only one holiday per date is allowed, so pick a random day in next year to avoid leftovers on the shared demo
    const year = new Date().getFullYear() + 1;
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${year}-${pad(Cypress._.random(1, 12))}-${pad(Cypress._.random(1, 28))}`;
    cy.visitApp('/leave/saveHolidays');
    cy.field('Name').find('input').type(name);
    cy.typeDate('Date', date);
    cy.selectOption('Full Day/ Half Day', 'Half Day');
    cy.submitForm('Save');
    cy.expectToast('Successfully Saved');
    cy.url().should('include', '/leave/viewHolidayList');
    cy.get('.oxd-form-loader').should('not.exist');
    cy.typeDate('From', `${year}-01-01`);
    cy.typeDate('To', `${year}-12-31`);
    cy.searchAndWait('/leave/holidays');
    cy.contains('.oxd-table-card', name).find('.bi-trash').click();
    cy.confirmDelete();
    cy.expectToast('Successfully Deleted');
  });
});
