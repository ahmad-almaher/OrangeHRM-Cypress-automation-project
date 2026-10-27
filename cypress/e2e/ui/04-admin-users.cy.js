import { newEmployee, newUsername, strongPassword } from '../../support/data';

describe('Admin - User Management', { tags: '@admin' }, () => {
  const created = [];

  beforeEach(() => {
    cy.login();
    cy.visitApp('/admin/viewSystemUsers');
  });

  after(() => {
    cy.login();
    cy.deleteEmployees(created);
  });

  it('shows the System Users list with expected columns', { tags: '@smoke' }, () => {
    cy.contains('h5', 'System Users').should('be.visible');
    ['Username', 'User Role', 'Employee Name', 'Status', 'Actions'].forEach((col) =>
      cy.contains('.oxd-table-header .oxd-table-th', col).should('be.visible'),
    );
    cy.recordCount().should('be.greaterThan', 0);
  });

  it('searches users by username', () => {
    cy.field('Username').find('input').type('Admin');
    cy.searchAndWait('/admin/users');
    cy.tableRows().should('have.length.at.least', 1);
    cy.tableRows().each(($row) => expect($row.find('.oxd-table-cell').eq(1).text()).to.eq('Admin'));
  });

  it('shows "No Records Found" for an unknown username', () => {
    cy.field('Username').find('input').type(`nobody_${Date.now()}`);
    cy.submitForm('Search');
    cy.expectToast('No Records Found');
    cy.tableRows().should('not.exist');
  });

  it('filters users by role', () => {
    cy.selectOption('User Role', 'Admin');
    cy.searchAndWait('/admin/users');
    cy.tableRows().each(($row) => expect($row.find('.oxd-table-cell').eq(2).text()).to.eq('Admin'));
  });

  it('filters users by status', () => {
    cy.selectOption('Status', 'Enabled');
    cy.searchAndWait('/admin/users');
    cy.tableRows().each(($row) => expect($row.find('.oxd-table-cell').eq(4).text()).to.eq('Enabled'));
  });

  it('resets the search filters', () => {
    cy.field('Username').find('input').type('Admin');
    cy.selectOption('User Role', 'ESS');
    cy.contains('button', 'Reset').click();
    cy.field('Username').find('input').should('have.value', '');
    cy.field('User Role').find('.oxd-select-text-input').should('have.text', '-- Select --');
  });

  // Sorting is done by the database, whose collation differs from JavaScript's sort for symbols and digits.
  // So we check the right sort is requested and that the table shows exactly the order the server returned.
  it('sorts usernames ascending', () => {
    cy.intercept('GET', '**/api/v2/admin/users?*sortOrder=ASC*').as('sorted');
    cy.contains('.oxd-table-th', 'Username').find('.oxd-table-header-sort').click();
    cy.get('.oxd-table-header-sort-dropdown').contains('Ascending').click();
    cy.wait('@sorted').then(({ request, response }) => {
      expect(request.url).to.include('sortField=u.userName');
      const expected = response.body.data.map((u) => u.userName);
      cy.tableRows().should(($rows) => {
        const shown = [...$rows].map((r) => r.querySelectorAll('.oxd-table-cell')[1].innerText.trim());
        expect(shown).to.deep.equal(expected);
      });
      const collator = new Intl.Collator('en', { sensitivity: 'base' });
      expect(collator.compare(expected[0], expected.at(-1))).to.be.at.most(0);
    });
  });

  describe('Add user form validation', () => {
    beforeEach(() => {
      cy.contains('button', 'Add').click();
      cy.url().should('include', '/admin/saveSystemUser');
    });

    it('requires all mandatory fields', () => {
      cy.submitForm('Save');
      // Password is only enforced once typed into, so it is covered by the password tests below
      ['User Role', 'Employee Name', 'Status', 'Username'].forEach((label) =>
        cy.field(label).find('.oxd-input-field-error-message').should('have.text', 'Required'),
      );
    });

    it('rejects mismatched passwords', () => {
      cy.field('Password').find('input').type('Passw0rd!');
      cy.field('Confirm Password').find('input').type('Different1!');
      cy.field('Confirm Password').should('contain', 'Passwords do not match');
    });

    it('rejects a short password', () => {
      cy.field('Password').find('input').type('ab1');
      cy.field('Password').should('contain', 'Should have at least 7 characters');
    });

    it('rejects a short username', () => {
      cy.field('Username').find('input').type('abc');
      cy.field('Username').should('contain', 'Should be at least 5 characters');
    });

    it('rejects an existing username', () => {
      cy.field('Username').find('input').type('Admin');
      cy.field('Username').should('contain', 'Already exists');
    });

    it('returns to the list on Cancel', () => {
      cy.contains('button', 'Cancel').click();
      cy.url().should('include', '/admin/viewSystemUsers');
    });
  });

  it('creates, edits and deletes a system user end-to-end', { tags: '@crud' }, () => {
    const emp = newEmployee();
    const username = newUsername();
    const password = strongPassword();

    cy.createEmployee(emp).then(({ empNumber }) => created.push(empNumber));

    // Create
    cy.contains('button', 'Add').click();
    cy.url().should('include', '/admin/saveSystemUser');
    cy.get('.oxd-form-loader').should('not.exist');
    cy.selectOption('User Role', 'ESS');
    cy.autocomplete('Employee Name', emp.lastName);
    cy.selectOption('Status', 'Enabled');
    cy.field('Username').find('input').type(username);
    cy.field('Password').find('input').type(password, { log: false });
    cy.field('Confirm Password').find('input').type(password, { log: false });
    // Saving navigates back to the list; wait for it to load before typing, or keystrokes hit a dead page
    cy.intercept('GET', '**/api/v2/admin/users?*').as('usersList');
    cy.submitForm('Save');
    cy.expectToast('Successfully Saved');
    cy.url().should('include', '/admin/viewSystemUsers');
    cy.wait('@usersList');

    // Find it
    cy.field('Username').find('input').type(username);
    cy.searchAndWait('/admin/users');
    cy.tableRows().should('have.length', 1).and('contain', 'ESS').and('contain', 'Enabled');

    // Edit: disable the user
    cy.tableRows().first().find('.bi-pencil-fill').click();
    cy.url().should('include', '/admin/saveSystemUser/');
    cy.field('Username').find('input').should('have.value', username);
    cy.selectOption('Status', 'Disabled');
    cy.intercept('GET', '**/api/v2/admin/users?*').as('usersList');
    cy.submitForm('Save');
    cy.expectToast('Successfully Updated');
    cy.url().should('include', '/admin/viewSystemUsers');
    cy.wait('@usersList');
    cy.field('Username').find('input').type(username);
    cy.searchAndWait('/admin/users');
    cy.tableRows().should('have.length', 1).and('contain', 'Disabled');

    // Delete
    cy.tableRows().first().find('.bi-trash').click();
    cy.confirmDelete();
    cy.expectToast('Successfully Deleted');
    cy.field('Username').find('input').clear().type(username);
    cy.searchAndWait('/admin/users');
    cy.tableRows().should('not.exist');
  });

  it('cancels a delete from the confirmation dialog', () => {
    cy.tableRows().last().find('.bi-trash').click();
    cy.get('.oxd-dialog-sheet').should('be.visible').and('contain', 'Are you Sure?');
    cy.contains('.oxd-dialog-sheet button', 'No, Cancel').click();
    cy.get('.oxd-dialog-sheet').should('not.exist');
  });
});
