import { lazy, type ComponentType } from 'react'

// Wrap React.lazy to avoid the TS type mismatch between LazyExoticComponent
// and ComponentType — the cast is safe because lazy components are callable
// as JSX elements in exactly the same way.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lz(loader: () => Promise<{ default: ComponentType<any> }>): ComponentType {
  return lazy(loader) as unknown as ComponentType
}

export type NavEntry =
  | { type: 'cat'; label: string }
  | { type: 'tool'; name: string; title: string; desc: string; component: ComponentType }

export const NAV: NavEntry[] = [
  { type: 'cat', label: 'USERS' },
  {
    type: 'tool',
    name: 'YearGroup',
    title: 'Year Group Passwords',
    desc: 'Reset passwords for an entire year group',
    component: lz(() => import('./tools/YearGroup'))
  },
  {
    type: 'tool',
    name: 'UserReset',
    title: 'User Password Reset',
    desc: 'Reset a single account password',
    component: lz(() => import('./tools/UserPasswordReset'))
  },
  {
    type: 'tool',
    name: 'BulkUpn',
    title: 'Bulk UPN Change',
    desc: 'Move users to a different verified domain',
    component: lz(() => import('./tools/BulkUpn'))
  },
  {
    type: 'tool',
    name: 'ImmutableId',
    title: 'Immutable ID',
    desc: 'Assign immutable ID to user',
    component: lz(() => import('./tools/ImmutableId'))
  },
  {
    type: 'tool',
    name: 'Licenses',
    title: 'Licence Assignment',
    desc: 'Assign and remove M365 licences',
    component: lz(() => import('./tools/Licenses'))
  },
  { type: 'cat', label: 'DEVICES' },
  {
    type: 'tool',
    name: 'LastDevice',
    title: 'Last Device',
    desc: 'Login history and stale device detection',
    component: lz(() => import('./tools/LastDevice'))
  },
  { type: 'cat', label: 'AUDIT' },
  {
    type: 'tool',
    name: 'SignIn',
    title: 'Sign-In Logs',
    desc: 'Browse Entra ID sign-in events',
    component: lz(() => import('./tools/SignInLogs'))
  },
  { type: 'cat', label: 'GROUPS & TEAMS' },
  {
    type: 'tool',
    name: 'GroupCopy',
    title: 'Group Copy',
    desc: 'Copy memberships from one user to another',
    component: lz(() => import('./tools/GroupCopy'))
  },
  {
    type: 'tool',
    name: 'Teams',
    title: 'Teams Provisioning',
    desc: 'Create and populate Microsoft Teams',
    component: lz(() => import('./tools/Teams'))
  },
  { type: 'cat', label: 'MAILBOX & EXCHANGE' },
  {
    type: 'tool',
    name: 'MailboxDelegation',
    title: 'Mailbox Delegation',
    desc: 'Send As, Send on Behalf, and inbox access',
    component: lz(() => import('./tools/MailboxDelegation'))
  },
  { type: 'cat', label: 'SECURITY' },
  {
    type: 'tool',
    name: 'SecureScore',
    title: 'Secure Score',
    desc: 'Microsoft Secure Score and control status',
    component: lz(() => import('./tools/SecureScore'))
  },
  { type: 'cat', label: 'APP' },
  {
    type: 'tool',
    name: 'Changelog',
    title: 'Update History',
    desc: 'Version changelog and release notes',
    component: lz(() => import('./tools/UpdateHistory'))
  }
]

export function toolComponent(name: string): ComponentType | null {
  const e = NAV.find((n) => n.type === 'tool' && n.name === name)
  return e && e.type === 'tool' ? e.component : null
}
