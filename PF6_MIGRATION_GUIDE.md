# PatternFly 6 Migration Guide for Cypress E2E Tests

This guide documents **verified** breaking changes when migrating Cypress e2e tests from PatternFly 5 to PatternFly 6. Each item was confirmed through actual test failures and DOM inspection against ACM 2.16 / MCE 2.11.

---

## 1. CSS Class Prefix: `pf-v5-c-` → `pf-v6-c-`

All PatternFly component CSS classes changed prefix.

```bash
grep -r "pf-v5-c-" --include="*.js"
```

```javascript
// Before
cy.get('.pf-v5-c-button');
// After
cy.get('.pf-v6-c-button');
```

---

## 2. Tabs: `<a>` Links → `<button>` Elements

**This is the most common breakage.** PF6 horizontal tabs use `<button>` elements with `role="tab"`, not `<a>` links.

```bash
grep -rn "nav__link\|\.pf-.*tabs__link" --include="*.js"
grep -rn "findByRole.*link" --include="*.js"
```

```javascript
// Before (PF5) - tabs were anchor links
cy.get('.pf-v5-c-nav__link').contains('Overview').click();
cy.get('#content .pf-v5-c-tabs__link').filter(':contains("Machine pools")').click();

// After (PF6) - tabs are buttons
cy.get('button.pf-v6-c-tabs__link').contains('Overview').click();
cy.get('button.pf-v6-c-tabs__link').contains('Machine pools').click();

// Or use ARIA roles (most robust)
cy.findByRole('tab', { name: /Overview/ }).click();

// SIDEBAR NAVIGATION is still <a> links:
cy.get('.pf-v6-c-nav__link').contains('Home').click();
```

---

## 3. Dropdown Menu Items: `<a>` → `<button>` with New Classes

PF6 completely redesigned dropdowns. Menu items changed from `<a>` elements to `<button>` elements, and use the Menu component (`pf-v6-c-menu`) instead of the old Dropdown component (`pf-v6-c-dropdown`).

### DOM Structure (verified)

```html
<!-- PF6 Dropdown/Menu -->
<div class="pf-v6-c-menu" data-ouia-component-type="PF6/Dropdown">
  <ul role="menu" class="pf-v6-c-menu__list">
    <li class="pf-v6-c-menu__list-item" role="none">
      <button class="pf-v6-c-menu__item" role="menuitem" id="hibernate-cluster">
        <span class="pf-v6-c-menu__item-text">Hibernate cluster</span>
      </button>
    </li>
  </ul>
</div>
```

### Selector Strategies (best → worst)

```javascript
// BEST: Use element IDs (stable, unique)
cy.get('#hibernate-cluster').click();
cy.get('#resume-cluster').click();
cy.get('#detach-cluster').click();
cy.get('#edit-labels').click();

// GOOD: Use ARIA role (works across PF versions)
cy.findByRole('menuitem', { name: /Hibernate cluster/i }).click();
cy.findByRole('menuitem', { name: /Export all to CSV/i }).click();

// OK: Use PF6 class
cy.get('button.pf-v6-c-menu__item').contains('Hibernate cluster').click();

// BROKEN (PF5 patterns that no longer work):
cy.get('a[text="Hibernate cluster"]'); // <a> elements gone, text attr invalid
cy.get('a[data-ouia-component-id="..."]'); // <a> elements gone
cy.get('button.pf-v6-c-dropdown__menu-item'); // class renamed to pf-v6-c-menu__item
```

### Shared Selectors Update

```javascript
// In commonSelectors.js - support both old and new patterns
dropDownMenu: '.pf-v6-c-dropdown__menu, .pf-v6-c-menu',
dropDownMenuItem: 'button.pf-v6-c-dropdown__menu-item, button.pf-v6-c-menu__item',
```

### Known IDs for ACM Cluster Row Actions

| Action                     | Element ID                    |
| -------------------------- | ----------------------------- |
| Edit labels                | `#edit-labels`                |
| Search cluster             | `#search-cluster`             |
| Select channel             | `#select-channel`             |
| Upgrade cluster            | `#upgrade-cluster`            |
| Update automation template | `#update-automation-template` |
| Hibernate cluster          | `#hibernate-cluster`          |
| Resume cluster             | `#resume-cluster`             |
| Detach cluster             | `#detach-cluster`             |
| Destroy cluster            | `#destroy-cluster`            |

### Known IDs for ClusterSet Row Actions

| Action                      | Element ID                     |
| --------------------------- | ------------------------------ |
| Edit namespace bindings     | `#edit-bindings`               |
| Manage resource assignments | `#manage-clusterSet-resources` |
| Delete cluster set          | `#delete-clusterSet`           |

---

## 4. Chips → Labels

PF6 replaced `Chip` components with `Label` components in some contexts (e.g., namespace bindings, filter chips).

```javascript
// Before (PF5)
chipText: '.pf-v5-c-chip__text',
chip: '.pf-v5-c-chip',

// After (PF6) - support both for safety
chipText: '.pf-v6-c-chip__text, .pf-v6-c-label__text',
chip: '.pf-v6-c-chip, .pf-v6-c-label',
```

### Label Close Button

The close/remove button on PF6 labels has a dynamic `aria-label` that includes the item name:

```html
<span class="pf-v6-c-label pf-m-outline">
  <span class="pf-v6-c-label__content">
    <span class="pf-v6-c-label__text">my-namespace</span>
  </span>
  <span class="pf-v6-c-label__actions">
    <button aria-label="Close my-namespace">×</button>
    <!-- dynamic aria-label! -->
  </span>
</span>
```

```javascript
// Use starts-with selector for the close button
cy.get('.pf-v6-c-label__text')
  .contains('my-namespace')
  .closest('.pf-v6-c-label')
  .find('.pf-v6-c-label__actions')
  .click();
```

---

## 5. Combobox/Select Options: `role="button"` → `role="option"`

PF6 combobox dropdown items use `role="option"` inside a `role="listbox"`, not `role="button"`.

```javascript
// Before (PF5)
cy.get('#imageSet-group').type(version);
cy.get('[role="button"]#imageSet-item-0').click();

// After (PF6)
cy.get('#imageSet-group').type(version);
cy.get('#imageSet-group [role="listbox"]').find('[role="option"]').first().click();
```

---

## 6. Lightspeed AI Popover Interference

ACM consoles with Lightspeed AI enabled have a `<button class="lightspeed__popover-button">` that can interfere with `cy.get('button').contains(text)` selectors — Cypress may find the Lightspeed button instead of the intended menu item.

```javascript
// PROBLEM: matches Lightspeed button before the actual menu item
cy.get('button').contains('Resume cluster').click();

// FIX Option 1: Use element ID (best)
cy.get('#resume-cluster').click();

// FIX Option 2: Use findByRole
cy.findByRole('menuitem', { name: /Resume cluster/i }).click();

// FIX Option 3: Exclude Lightspeed in broad selectors
cy.get('button:not(.lightspeed__popover-button)').contains('Resume cluster').click();
```

---

## 7. Disabled State Assertions

PF6 uses `aria-disabled="true"` or `pf-m-aria-disabled` class instead of native `disabled` attribute. Add Chai assertion overrides in `cypress/support/e2e.js` — see the existing implementation in this repo.

```javascript
// These work after the Chai override:
cy.get('button').should('be.enabled');
cy.get('button').should('be.disabled');

// Wait for button to not be in progress state before clicking:
cy.get('#resume-cluster').should('be.visible').and('not.have.class', 'pf-m-aria-disabled').click();
```

---

## 8. Portal Rendering for Menus

PF6 renders dropdown/menu content at `<body>` level (portal), breaking `.within()` scoping.

```javascript
// Before - menu items inside the scoped element
cy.get(tableRow).within(() => {
  cy.get('button[aria-label="Actions"]').click();
  cy.get('[role="menuitem"]').contains('Delete').click(); // FAILS
});

// After - click inside scope, find menu outside
cy.get(tableRow).within(() => {
  cy.get('button[aria-label="Actions"]').click();
});
cy.findByRole('menuitem', { name: /Delete/i }).click();
```

---

## 9. CSS Overflow Clipping

PF6 layout changes can cause elements to be clipped by parent `overflow: hidden`. This breaks `.should('be.visible')` checks.

```javascript
// FAILS: element exists but parent clips it
cy.get('span').contains('Hosting service cluster node').should('be.visible');

// FIX: scroll to element first, or just check existence
cy.get('span').contains('Hosting service cluster node').should('exist');

// FIX: scroll into view for elements below the fold
cy.get('#code-content').scrollIntoView();
cy.contains('#code-content', 'expected text').should('be.visible');
```

---

## 10. Product Text Changes (Not PF6, but Common During Migration)

These often happen alongside PF6 migration:

| Old Text              | New Text                                                  |
| --------------------- | --------------------------------------------------------- |
| Ansible Tower         | Ansible Automation controller                             |
| User management (tab) | Role assignments (new tab, coexists with User management) |

---

## 11. Other PF6 Changes

### OUIA Component Types: `PF5/*` → `PF6/*`

```javascript
// Before
cy.get('[data-ouia-component-type="PF5/Button"]');
// After
cy.get('[data-ouia-component-type="PF6/Button"]');
```

### Wizard Step IDs: `#review-step` → `#review`

```javascript
// Before
cy.get('#review-step');
// After
cy.get('#review');
```

### Layout Classes: `pf-l-` → `pf-v6-l-`

### Title Size Modifiers Removed

```javascript
// Before
cy.get('h4.pf-v5-c-title.pf-m-md');
// After (size modifiers dropped)
cy.get('h4.pf-v6-c-title');
```

---

## Quick Audit Commands

```bash
# PF5 class references (should be zero after migration)
grep -rn "pf-v5-c-" --include="*.js"

# Old a[text="..."] selectors (invalid in PF6)
grep -rn 'a\[text=' --include="*.js"

# Dropdown items using old <a> element
grep -rn "a\[data-ouia-component-id.*DropdownItem" --include="*.js"

# Old dropdown menu item class
grep -rn "pf-v6-c-dropdown__menu-item" --include="*.js"

# role="button" on combobox items (should be role="option")
grep -rn 'role="button".*item-0' --include="*.js"

# Broad button selectors that might hit Lightspeed
grep -rn "get('button').contains\|get('a, button').contains" --include="*.js"

# OUIA PF5 references
grep -rn "PF5/" --include="*.js"
```

---

## Migration Checklist

### CSS

- [ ] `pf-v5-c-` → `pf-v6-c-`
- [ ] `pf-l-` → `pf-v6-l-`
- [ ] Remove title size modifiers (`pf-m-md`, `pf-m-lg`)

### Tabs

- [ ] Tab selectors use `button.pf-v6-c-tabs__link` (not `<a>`)
- [ ] `findByRole('link')` → `findByRole('tab')` for tabs

### Dropdowns/Menus

- [ ] Use element IDs (`#hibernate-cluster`) or `findByRole('menuitem')` for menu items
- [ ] Remove `a[text="..."]` selectors (replace with IDs)
- [ ] Update `dropDownMenuItem` constant to include `button.pf-v6-c-menu__item`
- [ ] Exclude `.lightspeed__popover-button` from broad button selectors

### Chips/Labels

- [ ] Support both `.pf-v6-c-chip` and `.pf-v6-c-label` in selectors
- [ ] Use `.pf-v6-c-label__actions` for close buttons (dynamic `aria-label`)

### Combobox

- [ ] `[role="button"]` → `[role="option"]` for dropdown items
- [ ] Use `[role="listbox"]` to scope option searches

### Disabled State

- [ ] Add Chai assertion overrides for `be.enabled` / `be.disabled`
- [ ] Check for `pf-m-aria-disabled` class, not just native `disabled`

### OUIA

- [ ] `PF5/*` → `PF6/*` in `data-ouia-component-type`

### Testing

- [ ] Run tests iteratively — cascade failures are common (shared state)
- [ ] Use DOM inspector to verify selectors before guessing

---

## Version Info

- **PatternFly 5 → PatternFly 6**
- **ACM Version:** 2.16 / MCE 2.11
- **Last Updated:** February 2026
- **Verified with:** Cypress 13.15, Chrome/Electron, @testing-library/cypress
