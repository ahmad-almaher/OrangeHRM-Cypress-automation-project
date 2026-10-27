class LoginPage {
  visit() {
    cy.visit('/web/index.php/auth/login');
    cy.get('.orangehrm-login-title').should('have.text', 'Login');
  }

  username() { return cy.get('input[name="username"]'); }
  password() { return cy.get('input[name="password"]'); }
  submit() { return cy.get('button[type="submit"]'); }
  alert() { return cy.get('.oxd-alert-content-text'); }
  fieldErrors() { return cy.get('.oxd-input-field-error-message'); }
  forgotPasswordLink() { return cy.contains('.orangehrm-login-forgot-header', 'Forgot your password?'); }

  login(username, password) {
    if (username) this.username().type(username);
    if (password) this.password().type(password, { log: false });
    this.submit().click();
  }
}

export default new LoginPage();
