import { faker } from '@faker-js/faker';

const uid = () => `${Date.now()}`.slice(-6) + faker.string.numeric(2);

export const newEmployee = () => ({
  firstName: `Cy${faker.person.firstName().replace(/\W/g, '')}`,
  middleName: '',
  lastName: `Auto${uid()}`,
  employeeId: `C${uid()}`.slice(0, 10),
});

export const newUsername = () => `cyuser_${uid()}`;

export const strongPassword = () => `Cy!${faker.string.alphanumeric(6)}9a`;

export const newCandidate = () => ({
  firstName: 'Cy',
  lastName: `Candidate${uid()}`,
  email: `cy.${uid()}@example.com`,
});

export const uniqueName = (prefix) => `${prefix} ${uid()}`;
