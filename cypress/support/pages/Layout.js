class Layout {
  sideMenu() { return cy.get('.oxd-main-menu'); }
  menuItems() { return cy.get('.oxd-main-menu-item'); }
  menuSearch() { return cy.get('.oxd-main-menu-search input'); }
  collapseButton() { return cy.get('.oxd-main-menu-button'); }
  header() { return cy.get('.oxd-topbar-header-breadcrumb'); }
  userDropdown() { return cy.get('.oxd-userdropdown-tab'); }
  topbarTabs() { return cy.get('.oxd-topbar-body-nav-tab'); }

  goTo(menuName) {
    cy.contains('.oxd-main-menu-item', new RegExp(`^${menuName}$`)).click();
  }

  openUserMenu() {
    this.userDropdown().click();
    return cy.get('.oxd-dropdown-menu');
  }

  logout() {
    this.openUserMenu().contains('Logout').click();
  }

  /** Open a top-bar tab (optionally a dropdown item underneath it). */
  openTopbar(tab, item) {
    cy.contains('.oxd-topbar-body-nav-tab', tab).click();
    if (item) cy.contains('.oxd-dropdown-menu .oxd-topbar-body-nav-tab-link', item).click();
  }
}

export default new Layout();
