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

Code & Visualization:
- DiffSnippet: { id, component: "DiffSnippet", parentId, code: string, language?: string, startLine?: number, highlightLines?: number[] }
  (inline code preview with line numbers and highlighted problem lines)
- BeforeAfterCode: { id, component: "BeforeAfterCode", parentId, before: string, after: string, language?: string }
  (side-by-side problem vs fix with "Copy fix" button)
- SeverityGauge: { id, component: "SeverityGauge", parentId, score: number, label?: string }
  (circular gauge 0-100: red 0-40, amber 41-70, green 71-100)
- FileHeatmap: { id, component: "FileHeatmap", parentId, files: [{name: string, issues: number, maxIssues: number}] }
  (bar chart showing issue density per file, clickable file names)
- SummaryStatsRow: { id, component: "SummaryStatsRow", parentId, stats: [{label: string, value: string|number, variant?: "default"|"success"|"danger"|"warning"|"info"}] }
  (row of metric cards: total findings, files affected, confidence avg, etc.)

Feedback & Rating:
- VoteButtons: { id, component: "VoteButtons", parentId, findingId: string, voted?: "up"|"down"|"na"|null }
  (thumbs up/down/N/A rating for findings)
- CommentDraft: { id, component: "CommentDraft", parentId, defaultText?: string, findingId?: string }
  (compose area for drafting PR comments with copy-to-clipboard)
- TagPills: { id, component: "TagPills", parentId, tags: [{id: string, label: string, color?: "accent"|"success"|"danger"|"warning"|"info"}], selected?: string[] }
  (clickable category filter tags, multi-select)
- ToastFeedback: { id, component: "ToastFeedback", parentId, message: string, variant?: "success"|"info"|"warning", duration?: number, visible?: boolean }
  (animated notification after actions)

RULES:
- Every component MUST have a unique "id" string
- Every component except the root MUST have "parentId" pointing to its parent
- The root component has no parentId
- Use "action" fields for interactive elements — these are event names the frontend handles
- For findings: wrap each in InteractiveCard with AcknowledgeCheckbox + VoteButtons + CopyButton as children
- Include DiffSnippet inside findings when code context is available
- If a fix is suggested, use BeforeAfterCode to show problem vs solution
- For verdict: use Card with SeverityGauge + Badge + ProgressTracker
- Start with SummaryStatsRow showing key metrics (total findings, files, avg confidence)
- Add TagPills for category filtering (performance, security, style, logic)
- Group findings using Tabs (by file) or CollapsibleSection (by priority)
- Add a FilterBar at the top for severity filtering
- Add a ProgressTracker to show triage progress
- Add FileHeatmap to visualize which files have the most issues
- Use CommentDraft inside findings so users can compose PR comments

OUTPUT FORMAT:
Return ONLY a valid JSON array (no markdown, no explanation):
[
  {"version":"v0.9","createSurface":{"surfaceId":"main"}},
  {"version":"v0.9","updateComponents":{"surfaceId":"main","components":[...all components...]}},
  {"version":"v0.9","beginRendering":{"surfaceId":"main"}}
]
`;
