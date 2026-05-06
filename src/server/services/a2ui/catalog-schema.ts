export const CATALOG_SCHEMA = `
Available A2UI v0.9 components for rendering an interactive code review:

Layout:
- Row: { id, component: "Row", parentId, gap?: number, align?: "start"|"center"|"end" }
- Column: { id, component: "Column", parentId, gap?: number }
- Card: { id, component: "Card", parentId, title?: string, subtitle?: string, variant?: "default"|"elevated"|"outlined" }
- Divider: { id, component: "Divider", parentId }
- Tabs: { id, component: "Tabs", parentId, tabs: [{id: string, label: string}], activeTab?: string }

Text & Display:
- Text: { id, component: "Text", parentId, text: string, variant?: "h1"|"h2"|"h3"|"body"|"caption"|"code" }
- Badge: { id, component: "Badge", parentId, text: string, variant?: "success"|"danger"|"warning"|"info"|"default" }
- ProgressBar: { id, component: "ProgressBar", parentId, value: number, max: number, label?: string, color?: "accent"|"success"|"danger"|"warning" }

Interactive:
- Button: { id, component: "Button", parentId, label: string, variant?: "primary"|"secondary"|"danger"|"success"|"ghost", action: string, actionPayload?: object }
- CheckBox: { id, component: "CheckBox", parentId, label: string, checked?: boolean, action: string, actionPayload?: object }
- TextField: { id, component: "TextField", parentId, label?: string, placeholder?: string, value?: string }
- ChoicePicker: { id, component: "ChoicePicker", parentId, label?: string, choices: [{id: string, label: string}], selected?: string, action: string }

Domain-specific:
- InteractiveCard: { id, component: "InteractiveCard", parentId, title: string, severity?: "critical"|"high"|"medium"|"low"|"info", fileLine?: string }
  (children: content components + action buttons)
- ProgressTracker: { id, component: "ProgressTracker", parentId, total: number, addressed: number, label?: string }
- AcknowledgeCheckbox: { id, component: "AcknowledgeCheckbox", parentId, label: string, findingId: string }
- CopyButton: { id, component: "CopyButton", parentId, label: string, textToCopy: string }
- FilterBar: { id, component: "FilterBar", parentId, options: [{id: string, label: string, variant: string}], selected?: string[] }
- CollapsibleSection: { id, component: "CollapsibleSection", parentId, title: string, defaultOpen?: boolean }

RULES:
- Every component MUST have a unique "id" string
- Every component except the root MUST have "parentId" pointing to its parent
- The root component has no parentId
- Use "action" fields for interactive elements — these are event names the frontend handles
- For findings: wrap each in InteractiveCard with AcknowledgeCheckbox + CopyButton as children
- For verdict: use Card with Badge + ProgressTracker
- Group findings using Tabs (by file) or CollapsibleSection (by priority)
- Add a FilterBar at the top for severity filtering
- Add a ProgressTracker to show triage progress

OUTPUT FORMAT:
Return ONLY a valid JSON array (no markdown, no explanation):
[
  {"version":"v0.9","createSurface":{"surfaceId":"main"}},
  {"version":"v0.9","updateComponents":{"surfaceId":"main","components":[...all components...]}},
  {"version":"v0.9","beginRendering":{"surfaceId":"main"}}
]
`;
