import { Page, Locator } from '@playwright/test';
import { BasePage } from '@pages/BasePage';
import { GOV_TEMPLATE_DETAILS } from '@constants/governance';

/**
 * Policy template details page — description list with Labels field.
 * Shared between discovered and managed policy template details views.
 *
 * PF6 DescriptionList renders term/definition pairs as dt + dd siblings
 * inside a group wrapper div. Uses CSS adjacent sibling selector.
 */
export class PolicyTemplateDetailsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Get the value (dd element) for a named field in the description list.
   * Scoped to #template-details-section to avoid matching other description
   * lists on the page (e.g., cluster labels on managed policy results).
   */
  private getFieldValue(fieldName: string): Locator {
    return this.page
      .locator(
        `#${GOV_TEMPLATE_DETAILS.sectionId} dt:has-text("${fieldName}")`,
      )
      .first()
      .locator('+ dd');
  }

  getLabelsFieldValue(): Locator {
    return this.getFieldValue(GOV_TEMPLATE_DETAILS.fields.labels);
  }
}
