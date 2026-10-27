describe('Dashboard', { tags: '@dashboard' }, () => {
  beforeEach(() => {
    cy.login();
    cy.visitApp('/dashboard/index');
  });

  it('shows all dashboard widgets', { tags: '@smoke' }, () => {
    [
      'Time at Work',
      'My Actions',
      'Quick Launch',
      'Buzz Latest Posts',
      'Employees on Leave Today',
      'Employee Distribution by Sub Unit',
      'Employee Distribution by Location',
    ].forEach((w) => cy.contains('.orangehrm-dashboard-widget-name', w).should('be.visible'));
  });

  it('renders the employee distribution charts', () => {
    cy.get('.orangehrm-dashboard-widget canvas').should('have.length.at.least', 2);
  });

  const quickLaunch = [
    ['Assign Leave', '/leave/assignLeave'],
    ['Leave List', '/leave/viewLeaveList'],
    ['Timesheets', '/time/viewEmployeeTimesheet'],
    ['Apply Leave', '/leave/applyLeave'],
    ['My Leave', '/leave/viewMyLeaveList'],
    ['My Timesheet', '/time/viewMyTimesheet'],
  ];

  quickLaunch.forEach(([title, path]) => {
    it(`Quick Launch "${title}" opens ${path}`, () => {
      cy.contains('.orangehrm-quick-launch-card', title).find('button').click();
      cy.url().should('include', path);
    });
  });
});
