export const A2UI_EXAMPLES = `
EXAMPLE 1 — A single finding with severity badge, description, acknowledge checkbox, copy button, and ask-followup button:

Input review text:
"**High severity**: In src/auth.ts line 42, the password is logged in plaintext. This leaks credentials to stdout."

Output:
[
  {"version":"v0.9","createSurface":{"surfaceId":"main"}},
  {"version":"v0.9","updateComponents":{"surfaceId":"main","components":[
    {"id":"root","component":"Column","gap":12},
    {"id":"finding-1","component":"InteractiveCard","parentId":"root","title":"Password logged in plaintext","severity":"high","fileLine":"src/auth.ts:42"},
    {"id":"finding-1-desc","component":"Text","parentId":"finding-1","text":"The password is logged in plaintext. This leaks credentials to stdout.","variant":"body"},
    {"id":"finding-1-badge","component":"Badge","parentId":"finding-1","text":"High","variant":"danger"},
    {"id":"finding-1-actions","component":"Row","parentId":"finding-1","gap":8,"align":"center"},
    {"id":"finding-1-ack","component":"AcknowledgeCheckbox","parentId":"finding-1-actions","label":"Acknowledged","findingId":"finding-1"},
    {"id":"finding-1-copy","component":"CopyButton","parentId":"finding-1-actions","label":"Copy suggestion","textToCopy":"Remove the console.log(password) call at src/auth.ts:42"},
    {"id":"finding-1-ask","component":"Button","parentId":"finding-1-actions","label":"Ask follow-up","variant":"ghost","action":"askFollowUp","actionPayload":{"findingId":"finding-1"}}
  ]}},
  {"version":"v0.9","beginRendering":{"surfaceId":"main"}}
]

EXAMPLE 2 — A verdict section with progress tracker:

Input review text:
"Overall verdict: 3 findings total (1 critical, 1 high, 1 low). 0 addressed so far. The PR needs revision before merge."

Output:
[
  {"version":"v0.9","createSurface":{"surfaceId":"main"}},
  {"version":"v0.9","updateComponents":{"surfaceId":"main","components":[
    {"id":"root","component":"Column","gap":12},
    {"id":"verdict-card","component":"Card","parentId":"root","title":"Review Verdict","variant":"elevated"},
    {"id":"verdict-badge","component":"Badge","parentId":"verdict-card","text":"Needs Revision","variant":"danger"},
    {"id":"verdict-text","component":"Text","parentId":"verdict-card","text":"The PR needs revision before merge. 1 critical, 1 high, and 1 low severity findings identified.","variant":"body"},
    {"id":"verdict-progress","component":"ProgressTracker","parentId":"verdict-card","total":3,"addressed":0,"label":"Findings addressed"},
    {"id":"verdict-divider","component":"Divider","parentId":"verdict-card"},
    {"id":"verdict-filter","component":"FilterBar","parentId":"verdict-card","options":[{"id":"critical","label":"Critical","variant":"danger"},{"id":"high","label":"High","variant":"warning"},{"id":"low","label":"Low","variant":"default"}],"selected":["critical","high","low"]}
  ]}},
  {"version":"v0.9","beginRendering":{"surfaceId":"main"}}
]
`;
