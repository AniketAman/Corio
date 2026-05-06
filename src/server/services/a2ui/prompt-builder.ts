import { CATALOG_SCHEMA } from './catalog-schema.js';
import { A2UI_EXAMPLES } from './examples.js';

const SYSTEM_INSTRUCTION = `You are a format converter. Convert the following code review into an interactive A2UI v0.9 component tree. Use interactive elements (checkboxes, buttons, filters) to make findings actionable. Output ONLY valid JSON.`;

export function buildConversionPrompt(reviewText: string): string {
  return `${SYSTEM_INSTRUCTION}

${CATALOG_SCHEMA}

${A2UI_EXAMPLES}

Now convert the following code review into A2UI format:

${reviewText}`;
}
