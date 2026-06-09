import type { ComponentType } from 'react'
import YearGroup from './tools/YearGroup'
import UserPasswordReset from './tools/UserPasswordReset'
import BulkUpn from './tools/BulkUpn'
import ImmutableId from './tools/ImmutableId'
import LastDevice from './tools/LastDevice'
import SignInLogs from './tools/SignInLogs'
import GroupCopy from './tools/GroupCopy'
import Teams from './tools/Teams'
import UpdateHistory from './tools/UpdateHistory'

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
    component: YearGroup
  },
  {
    type: 'tool',
    name: 'UserReset',
    title: 'User Password Reset',
    desc: 'Reset a single account password',
    component: UserPasswordReset
  },
  {
    type: 'tool',
    name: 'BulkUpn',
    title: 'Bulk UPN Change',
    desc: 'Move users to a different verified domain',
    component: BulkUpn
  },
  {
    type: 'tool',
    name: 'ImmutableId',
    title: 'Immutable ID',
    desc: 'Assign immutable ID to user',
    component: ImmutableId
  },
  { type: 'cat', label: 'DEVICES' },
  {
    type: 'tool',
    name: 'LastDevice',
    title: 'Last Device',
    desc: 'Login history and stale device detection',
    component: LastDevice
  },
  { type: 'cat', label: 'AUDIT' },
  {
    type: 'tool',
    name: 'SignIn',
    title: 'Sign-In Logs',
    desc: 'Browse Entra ID sign-in events',
    component: SignInLogs
  },
  { type: 'cat', label: 'GROUPS & TEAMS' },
  {
    type: 'tool',
    name: 'GroupCopy',
    title: 'Group Copy',
    desc: 'Copy memberships from one user to another',
    component: GroupCopy
  },
  {
    type: 'tool',
    name: 'Teams',
    title: 'Teams Provisioning',
    desc: 'Create and populate Microsoft Teams',
    component: Teams
  },
  { type: 'cat', label: 'APP' },
  {
    type: 'tool',
    name: 'Changelog',
    title: 'Update History',
    desc: 'Version changelog and release notes',
    component: UpdateHistory
  }
]

export function toolComponent(name: string): ComponentType | null {
  const e = NAV.find((n) => n.type === 'tool' && n.name === name)
  return e && e.type === 'tool' ? e.component : null
}
