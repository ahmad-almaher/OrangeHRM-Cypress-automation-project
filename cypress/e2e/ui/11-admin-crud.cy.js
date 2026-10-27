import { uniqueName } from '../../support/data';

describe('Admin - Configuration CRUD', { tags: ['@admin', '@crud'] }, () => {
  beforeEach(() => cy.login());

  // Simple "name only" lists: [page, list path, form field label]
  const simpleLists = [
    ['Employment Status', '/admin/employmentStatus', 'Name'],
    ['Job Categories', '/admin/jobCategory', 'Name'],
    ['Education', '/admin/viewEducation', 'Level'],
    ['Licenses', '/admin/viewLicenses', 'Name'],
    ['Languages', '/admin/viewLanguages', 'Name'],
    ['Memberships', '/admin/membership', 'Name'],
  ];

  simpleLists.forEach(([page, path, label]) => {
    describe(page, () => {
      beforeEach(() => {
        cy.visitApp(path);
        cy.contains('button', 'Add').click();
      });

      it('requires a value', () => {
        cy.submitForm('Save');
        cy.field(label).should('contain', 'Required');
      });

      it('returns to the list on Cancel', () => {
        cy.contains('button', 'Cancel').click();
        cy.url().should('include', path);
      });

      it('adds, edits, rejects a duplicate of and deletes a record', () => {
        const name = uniqueName('Cy');
        const renamed = `${name} Ed`;

        cy.field(label).find('input').type(name);
        cy.submitForm('Save');
        cy.expectToast('Successfully Saved');
        cy.url().should('include', path);

        cy.contains('.oxd-table-card', name).find('.bi-pencil-fill').click();
        cy.field(label).find('input').should('have.value', name).clear().type(renamed);
        cy.submitForm('Save');
        cy.expectToast('Successfully Updated');
        cy.contains('.oxd-table-card', renamed).should('be.visible');

        cy.contains('button', 'Add').click();
        cy.field(label).find('input').type(renamed);
        cy.field(label).should('contain', 'Already exists');
        cy.contains('button', 'Cancel').click();

        cy.contains('.oxd-table-card', renamed).find('.bi-trash').click();
        cy.confirmDelete();
        cy.expectToast('Successfully Deleted');
        cy.contains('.oxd-table-card', renamed).should('not.exist');
      });
    });
  });

  describe('Nationalities', () => {
    it('rejects a duplicate nationality', () => {
      cy.visitApp('/admin/nationality');
      cy.contains('button', 'Add').click();
      cy.field('Name').find('input').type('American');
      cy.field('Name').should('contain', 'Already exists');
    });
  });

  describe('Pay Grades', () => {
    it('adds a pay grade with a currency range, then deletes it', () => {
      const name = uniqueName('Cy Grade');
      cy.visitApp('/admin/viewPayGrades');
      cy.contains('button', 'Add').click();
      cy.field('Name').find('input').type(name);
      // Saving a new pay grade reloads the page into edit mode, which clears the toast, so check the URL instead
      cy.submitForm('Save');
      cy.url().should('match', /\/admin\/payGrade\/\d+/);
      cy.get('.oxd-form-loader').should('not.exist');

      cy.contains('.orangehrm-action-header', 'Currencies').find('button').click();
      cy.selectOption('Currency', 'United States Dollar');
      cy.field('Minimum Salary').find('input').type('5000');
      cy.field('Maximum Salary').find('input').type('1000');
      cy.field('Maximum Salary').should('contain', 'Should be higher than Minimum Salary');
      cy.field('Maximum Salary').find('input').clear().type('9000');
      cy.get('.orangehrm-card-container').last().within(() => cy.submitForm('Save'));
      cy.expectToast('Successfully Saved');
      cy.contains('.oxd-table-card', 'United States Dollar').should('contain', '5,000.00').and('contain', '9,000.00');

      cy.visitApp('/admin/viewPayGrades');
      cy.contains('.oxd-table-card', name).should('contain', 'United States Dollar').find('.bi-trash').click();
      cy.confirmDelete();
      cy.expectToast('Successfully Deleted');
    });
  });

  describe('Work Shifts', () => {
    it('requires a shift name and defaults the working hours', () => {
      cy.visitApp('/admin/workShift');
      cy.contains('button', 'Add').click();
      cy.contains('.oxd-input-group', 'Duration Per Day').should('contain', '8.00');
      cy.submitForm('Save');
      cy.field('Shift Name').should('contain', 'Required');
    });

    it('adds and deletes a work shift', () => {
      const name = uniqueName('Cy Shift');
      cy.visitApp('/admin/workShift');
      cy.contains('button', 'Add').click();
      cy.field('Shift Name').find('input').type(name);
      cy.submitForm('Save');
      cy.expectToast('Successfully Saved');
      cy.contains('.oxd-table-card', name).find('.bi-trash').click();
      cy.confirmDelete();
      cy.expectToast('Successfully Deleted');
    });
  });

  describe('Locations', () => {
    it('validates required location fields', () => {
      cy.visitApp('/admin/saveLocation');
      cy.submitForm('Save');
      cy.field('Name').should('contain', 'Required');
      cy.field('Country').should('contain', 'Required');
    });

    it('adds, finds and deletes a location', () => {
      const name = uniqueName('Cy Office');
      cy.visitApp('/admin/saveLocation');
      cy.field('Name').find('input').type(name);
      cy.field('City').find('input').type('Springfield');
      cy.selectOption('Country', 'Canada');
      cy.submitForm('Save');
      cy.expectToast('Successfully Saved');
      cy.url().should('include', '/admin/viewLocations');

      cy.field('Name').find('input').type(name);
      cy.submitForm('Search');
      cy.tableRows().should('have.length', 1).and('contain', 'Springfield').and('contain', 'Canada');
      cy.tableRows().first().find('.bi-trash').click();
      cy.confirmDelete();
      cy.expectToast('Successfully Deleted');
    });
  });
});
