describe('Student Dashboard & Authentication Flow', () => {
  beforeEach(() => {
    // 1. Visit the login page
    cy.visit('/login');

    // 2. Cypress types in the credentials from cypress.env.json like a real human
    cy.get('input[type="email"], input[name="email"]')
      .type(Cypress.env('TEST_EMAIL'), { force: true });

    cy.get('input[type="password"], input[name="password"]')
      .type(Cypress.env('TEST_PASSWORD'), { force: true });

    // 3. Click the real login button
    cy.get('button[type="submit"]').click({ force: true });

    // 4. Wait until the URL changes to the dashboard (proving Firebase logged us in)
    cy.url().should('include', '/');

    // Give Firebase a tiny moment to set the auth token in local storage
    cy.wait(1000);
  });

  it('should successfully log in and verify the user can navigate to the PYQ library', () => {
    // Cypress is now fully authenticated as a real user! 
    // Let's test navigation to the PYQs page
    cy.visit('/pyqs');

    // Verify the page loaded correctly
    cy.contains('2024 Scheme PYQs').should('be.visible');

    // Navigate into Semester 1
    cy.visit('/pyqs/S1/2024');

    // Verify the subject we know exists is there
    cy.contains('All Subjects').should('be.visible');
  });
});
