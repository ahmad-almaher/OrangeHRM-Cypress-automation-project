import { newEmployee, uniqueName, newCandidate } from '../../support/data';

describe('REST API v2', { tags: '@api' }, () => {
  beforeEach(() => cy.login());

  describe('Authorization', () => {
    it('rejects requests without a session', () => {
      cy.clearAllCookies();
      cy.request({ url: `${Cypress.env('apiPath')}/pim/employees`, failOnStatusCode: false })
        .its('status')
        .should('eq', 401);
    });
  });

  describe('PIM employees', () => {
    it('lists employees with pagination meta', { tags: '@smoke' }, () => {
      cy.apiGet('/pim/employees', { limit: 5, offset: 0 }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.data).to.be.an('array').and.have.length.at.most(5);
        expect(res.body.meta.total).to.be.a('number').and.greaterThan(0);
        expect(res.body.data[0]).to.include.keys('empNumber', 'firstName', 'lastName', 'employeeId');
      });
    });

    it('creates, reads, updates and deletes an employee', { tags: '@crud' }, () => {
      const emp = newEmployee();
      cy.apiPost('/pim/employees', emp).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.data).to.include({ firstName: emp.firstName, lastName: emp.lastName });
        const { empNumber } = res.body.data;

        cy.apiGet(`/pim/employees/${empNumber}`).its('body.data.employeeId').should('eq', emp.employeeId);

        cy.apiPut(`/pim/employees/${empNumber}/personal-details`, {
          lastName: emp.lastName,
          firstName: 'Renamed',
          middleName: '',
          employeeId: emp.employeeId,
        }).its('body.data.firstName').should('eq', 'Renamed');

        cy.apiDelete('/pim/employees', [empNumber]).its('status').should('eq', 200);
        cy.apiGet(`/pim/employees/${empNumber}`).its('status').should('be.oneOf', [404, 422]);
      });
    });

    it('rejects an employee without a last name', () => {
      cy.apiPost('/pim/employees', { firstName: 'OnlyFirst' }).its('status').should('eq', 422);
    });

    it('filters employees by name', () => {
      const emp = newEmployee();
      cy.createEmployee(emp).then(({ empNumber }) => {
        cy.apiGet('/pim/employees', { nameOrId: emp.lastName }).then((res) => {
          expect(res.body.meta.total).to.eq(1);
          expect(res.body.data[0].empNumber).to.eq(empNumber);
        });
        cy.deleteEmployees([empNumber]);
      });
    });
  });

  describe('Admin', () => {
    it('lists system users and finds Admin', () => {
      cy.apiGet('/admin/users', { limit: 50 }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.data.some((u) => u.userRole.name === 'Admin')).to.eq(true);
      });
    });

    it('creates and deletes a job title', { tags: '@crud' }, () => {
      const title = uniqueName('API Title');
      cy.apiPost('/admin/job-titles', { title, description: 'api', note: '' }).then((res) => {
        expect(res.status).to.eq(200);
        const { id } = res.body.data;
        cy.apiGet('/admin/job-titles', { limit: 0 })
          .its('body.data')
          .should((list) => expect(list.map((j) => j.title)).to.include(title));
        cy.apiDelete('/admin/job-titles', [id]).its('status').should('eq', 200);
      });
    });

    ['/admin/nationalities', '/admin/employment-statuses', '/admin/job-categories', '/admin/locations', '/admin/skills'].forEach(
      (path) => {
        it(`GET ${path} returns 200`, () => {
          cy.apiGet(path).then((res) => {
            expect(res.status).to.eq(200);
            expect(res.body.data).to.be.an('array');
          });
        });
      },
    );
  });

  describe('Leave, Recruitment, Directory, Dashboard', () => {
    it('lists leave types', () => {
      cy.apiGet('/leave/leave-types').then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.data[0]).to.include.keys('id', 'name');
      });
    });

    it('creates and deletes a candidate', { tags: '@crud' }, () => {
      const c = newCandidate();
      cy.apiPost('/recruitment/candidates', {
        ...c,
        middleName: null,
        contactNumber: null,
        keywords: null,
        comment: null,
        dateOfApplication: new Date().toISOString().slice(0, 10),
        consentToKeepData: false,
      }).then((res) => {
        expect(res.status).to.eq(200);
        cy.apiDelete('/recruitment/candidates', [res.body.data.id]).its('status').should('eq', 200);
      });
    });

    it('lists directory employees', () => {
      cy.apiGet('/directory/employees', { limit: 10 }).its('body.data').should('have.length.greaterThan', 0);
    });

    it('returns dashboard widgets data', () => {
      cy.apiGet('/dashboard/employees/subunit').its('status').should('eq', 200);
      cy.apiGet('/dashboard/employees/locations').its('status').should('eq', 200);
      cy.apiGet('/dashboard/shortcuts').its('status').should('eq', 200);
    });

    it('returns the buzz feed', () => {
      cy.apiGet('/buzz/feed', { limit: 5, offset: 0, sortOrder: 'DESC', sortField: 'share.createdAtUtc' }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.data).to.be.an('array');
      });
    });
  });
});
