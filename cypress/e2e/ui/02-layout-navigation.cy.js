import Layout from '../../support/pages/Layout';

describe('Layout and navigation', { tags: '@navigation' }, () => {
  beforeEach(() => {
    cy.login();
    cy.visitApp('/dashboard/index');
  });

  it('lists all main menu items', { tags: '@smoke' }, () => {
    cy.fixture('menu').then((menu) => {
      Layout.menuItems().should('have.length.at.least', menu.length);
      menu.forEach(({ name }) => Layout.sideMenu().should('contain', name));
    });
  });

  it('navigates to every module from the side menu', () => {
    cy.fixture('menu').then((menu) => {
      menu.forEach(({ name, path, header }) => {
        Layout.goTo(name);
        cy.url().should('include', path);
        Layout.header().should('contain', header);
        cy.contains('.oxd-main-menu-item', new RegExp(`^${name}$`)).should('have.class', 'active');
      });
    });
  });

  it('filters the menu with the search box', () => {
    Layout.menuSearch().type('adm');
    Layout.menuItems().should('have.length', 1).and('contain', 'Admin');
    Layout.menuSearch().clear().type('le');
    Layout.menuItems().each(($el) => expect($el.text().toLowerCase()).to.include('le'));
  });

  it('shows no menu items for a search with no match', () => {
    Layout.menuSearch().type('zzzz');
    Layout.menuItems().should('not.exist');
  });

  it('collapses and expands the side menu', () => {
    Layout.collapseButton().click();
    Layout.menuSearch().should('not.be.visible');
    Layout.collapseButton().click();
    Layout.menuSearch().should('be.visible');
  });

  it('shows the user dropdown options', () => {
    Layout.openUserMenu().within(() => {
      ['About', 'Support', 'Change Password', 'Logout'].forEach((item) =>
        cy.contains(item).should('be.visible'),
      );
    });
  });

  it('opens and closes the About dialog', () => {
    Layout.openUserMenu().contains('About').click();
    cy.get('.oxd-dialog-sheet')
      .should('be.visible')
      .within(() => {
        cy.contains('Company Name').should('be.visible');
        cy.contains('Version').should('be.visible');
      });
    cy.get('.oxd-dialog-close-button').click();
    cy.get('.oxd-dialog-sheet').should('not.exist');
  });

  it('opens the Support page', () => {
    Layout.openUserMenu().contains('Support').click();
    cy.url().should('include', '/help/support');
    cy.contains('Getting Started with OrangeHRM').should('be.visible');
  });

  // The sidebar logo links out to orangehrm.com, so check the link rather than following it off-site
  it('links the brand logo to the OrangeHRM website', () => {
    cy.get('.oxd-brand-banner').then(($banner) => {
      const link = $banner.closest('a');
      expect(link, 'logo link').to.have.length(1);
      expect(link.attr('href')).to.match(/orangehrm\.com/);
    });
  });
});
