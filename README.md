# OrangeHRM Cypress Automation

End-to-end UI and REST API tests for the public OrangeHRM demo:
https://opensource-demo.orangehrmlive.com

## Setup

```bash
npm install
```

## Running

| Command | What it runs |
| --- | --- |
| `npm run cy:open` | Interactive Cypress runner |
| `npm test` | Every spec, headless (Electron) |
| `npm run test:chrome` | Every spec in Chrome |
| `npm run test:ui` | UI specs only |
| `npm run test:api` | API specs only |
| `npm run test:smoke` | Only tests tagged `@smoke` |
| `npm run test:report` | Every spec, headless, then opens the HTML report |
| `npm run test:report:headed` | Every spec in a visible Chrome window, then opens the HTML report |

### Headed mode

Add `--headed` to any `cypress run` to watch the browser while tests run:

- `npm run test:report:headed`: the full suite in visible Chrome, then the report opens.
- `npx cypress run --headed`: the full suite in visible Electron. Open the report afterwards with `npm run report:open`.
- `npx cypress run --headed --spec "cypress/e2e/ui/04-admin-users.cy.js"`: one spec, headed.
- `npm run cy:open`: the interactive runner, for stepping through commands one test at a time. It does not produce the HTML report.

Headed runs still retry a failed test twice, and the browser window closes when the run finishes.

### HTML report

Every `cypress run` writes a self-contained HTML report (pass/fail charts, durations, error messages and embedded failure screenshots) to `cypress/reports/index.html`.

The report opens on a **Summary & filters** tab, added by [scripts/enhance-report.js](scripts/enhance-report.js) after every run:

- A pass/fail verdict, pass rate, totals and duration at the top
- A results-by-spec table with a pass/fail bar per spec (click a spec to filter to it)
- A table of every test, filterable by status (All, Passed, Failed, Skipped, Flaky), spec and free-text search (title, suite or error), and sortable by slowest first. It opens on failures when there are any, each with its error and screenshot.

The original mochawesome view is under the **Detailed report** tab. To re-apply the summary to an existing report, run `npm run report:enhance`.

- `npm run test:report` runs the whole suite, then opens the report in your browser.
- `npm run test:report:headed` does the same in a visible Chrome window.
- `npm run report:open` reopens the last report.

Run any tag with `npx cypress run --env grepTags=@pim` (tags: `@smoke @auth @navigation @dashboard @admin @pim @leave @time @recruitment @myinfo @directory @buzz @performance @claim @maintenance @api @crud`).

## Layout

```
cypress/
  e2e/
    ui/              # one spec per module (login, navigation, dashboard, admin, PIM, leave, time, recruitment, ...)
    api/api.cy.js    # REST API v2 tests reusing the logged-in session cookie
  fixtures/          # credentials and menu data
  support/
    commands.js      # login (cy.session), form helpers for OrangeHRM widgets, API helpers
    pages/           # page objects (LoginPage, Layout)
    data.js          # faker-based unique test data
```

## Coverage

- **Auth**: valid/invalid login, required-field validation, Enter-to-submit, redirect when logged out, forgot password, logout, change-password validation
- **Navigation**: every side-menu module, menu search, collapse, user dropdown (About, Support), logo
- **Dashboard**: all widgets, charts, every Quick Launch shortcut
- **Admin**: user search/filter/sort/reset, add-user validation, full user create/edit/delete, all Job/Organization/Qualifications pages, Job Title and Skill CRUD
- **PIM**: list, search by id/name, filters, pagination, add employee (with and without login), duplicate id, edit personal and contact details, emergency contacts, dependents, profile tabs, delete
- **Leave**: list filters and validation, assign/apply/my leave, configure and entitlement pages, leave type and holiday CRUD
- **Time**: timesheets, attendance, reports, customer CRUD and duplicate check, project validation
- **Recruitment**: candidates and vacancies, filters, add-candidate validation and creation
- **My Info, Directory, Buzz, Performance, Claim, Maintenance**
- **API**: auth (401), employee CRUD and validation, users, job titles, lookup lists, leave types, candidates, directory, dashboard, buzz

## Notes

- The demo is public and shared, and it resets periodically. Tests create their own uniquely named data and clean it up, and never change the Admin password.
- Headless runs retry failed tests twice to absorb the demo's occasional slowness.
