import LoginPage from '../../support/pages/LoginPage';
import Layout from '../../support/pages/Layout';

describe('Authentication - Login', { tags: '@auth' }, () => {
  let users;

  before(() => cy.fixture('users').then((u) => (users = u)));

  beforeEach(() => LoginPage.visit());

  it('logs in with valid admin credentials', { tags: '@smoke' }, () => {
    LoginPage.login(users.admin.username, users.admin.password);
    cy.url().should('include', '/dashboard/index');
    Layout.header().should('contain', 'Dashboard');
    Layout.userDropdown().should('be.visible');
  });

  it('submits the form with the Enter key', () => {
    LoginPage.username().type(users.admin.username);
    LoginPage.password().type(`${users.admin.password}{enter}`, { log: false });
    cy.url().should('include', '/dashboard/index');
  });

  it('rejects an invalid username and password', { tags: '@smoke' }, () => {
    LoginPage.login(users.invalid.username, users.invalid.password);
    LoginPage.alert().should('have.text', 'Invalid credentials');
    cy.url().should('include', '/auth/login');
  });

  it('rejects a valid username with a wrong password', () => {
    LoginPage.login(users.admin.username, 'wrong-password');
    LoginPage.alert().should('have.text', 'Invalid credentials');
  });

  it('shows Required on both fields when submitted empty', () => {
    LoginPage.submit().click();
    LoginPage.fieldErrors()
      .should('have.length', 2)
      .each(($e) => expect($e).to.have.text('Required'));
  });

  it('shows Required when only the password is missing', () => {
    LoginPage.login(users.admin.username);
    LoginPage.fieldErrors().should('have.length', 1).and('have.text', 'Required');
  });

  it('shows Required when only the username is missing', () => {
    LoginPage.login(null, users.admin.password);
    LoginPage.fieldErrors().should('have.length', 1).and('have.text', 'Required');
  });

  it('masks the password field', () => {
    LoginPage.password().should('have.attr', 'type', 'password');
  });

  it('shows the login page branding, demo hints and footer', () => {
    cy.get('.orangehrm-login-branding img').should('be.visible');
    cy.contains('Username : Admin').should('be.visible');
    cy.contains('Password : admin123').should('be.visible');
    cy.get('.orangehrm-copyright').should('contain', 'OrangeHRM');
    cy.get('.orangehrm-login-footer-sm a').should('have.length.at.least', 4);
  });

  it('redirects unauthenticated users from a protected page to login', () => {
    cy.clearAllCookies();
    cy.visit('/web/index.php/pim/viewEmployeeList');
    cy.url().should('include', '/auth/login');
  });
});

describe('Authentication - Forgot password', { tags: '@auth' }, () => {
  beforeEach(() => {
    LoginPage.visit();
    LoginPage.forgotPasswordLink().click();
    cy.url().should('include', '/auth/requestPasswordResetCode');
  });

  it('shows the reset password form', () => {
    cy.get('.orangehrm-forgot-password-title').should('have.text', 'Reset Password');
    cy.get('input[name="username"]').should('be.visible');
  });

  it('requires a username', () => {
    cy.contains('button', 'Reset Password').click();
    cy.get('.oxd-input-field-error-message').should('have.text', 'Required');
  });

  it('returns to login on Cancel', () => {
    cy.contains('button', 'Cancel').click();
    cy.url().should('include', '/auth/login');
  });
});

describe('Authentication - Logout', { tags: '@auth' }, () => {
  it('logs out and blocks access to protected pages afterwards', { tags: '@smoke' }, () => {
    cy.fixture('users').then(({ admin }) => {
      LoginPage.visit();
      LoginPage.login(admin.username, admin.password);
    });
    cy.url().should('include', '/dashboard/index');
    Layout.logout();
    cy.url().should('include', '/auth/login');
    cy.visit('/web/index.php/dashboard/index');
    cy.url().should('include', '/auth/login');
  });
});
