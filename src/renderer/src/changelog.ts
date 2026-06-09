// Version changelog for the Electron rewrite. Add a new entry at the top each
// time a version ships (mirrors the PowerShell $Script:IH_History convention).

export type Release = { version: string; date: string; changes: string[] }

export const CHANGELOG: Release[] = [
  {
    version: '0.1.2',
    date: '2026-06-09',
    changes: [
      'Virtual scrolling on Last Device and Bulk UPN user lists — no more UI freeze with 2000+ users',
      'Users and devices in Last Device now load independently so each list appears as soon as its data arrives',
      'All tool panels are now lazy-loaded — smaller startup bundle, faster first paint',
      'Main window now waits for first frame before showing — eliminates blank flash on portable launch',
      'Graph API queries for users now filter disabled accounts server-side, reducing payload size',
      'Fixed startup auto-connect: saved tenant now silently reconnects on launch using cached MSAL token'
    ]
  },
  {
    version: '0.1.1',
    date: '2026-06-09',
    changes: [
      'Switched UI font to Lexend',
      'Fixed font not applying to buttons, inputs, and dropdowns',
      'Scrollbars now match the dark theme'
    ]
  },
  {
    version: '0.1.0',
    date: '2026-06-09',
    changes: [
      'Initial Electron + React + TypeScript rewrite of Art’s Entra Toolbox',
      'Multi-tenant sign-in with persisted MSAL token cache (DPAPI-encrypted)',
      'All tools ported: Year Group Passwords, User Password Reset, Bulk UPN Change, Immutable ID, Last Device, Sign-In Logs, Group Copy, Teams Provisioning',
      'Dry Run and Demo (Contoso Academy) modes, plus a live activity log pane'
    ]
  }
]
