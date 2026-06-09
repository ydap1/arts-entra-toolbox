// Fake "Contoso Academy" tenant — port of Demo.ps1. Lets the app be demonstrated
// without connecting to a real tenant. Data shapes mirror the real Graph responses.

export type DemoUser = {
  id: string
  displayName: string
  userPrincipalName: string
  department: string
  accountEnabled: boolean
}

type LoggedOn = { userId: string; lastLogOnDateTime: string }
export type DemoDevice = {
  id: string
  deviceName: string
  lastSyncDateTime: string | null
  usersLoggedOn: LoggedOn[]
}

export const demoUsers: DemoUser[] = [
  ['u-y10-01', 'Amara Osei', 'amara.osei', '10A'],
  ['u-y10-02', 'Callum Reid', 'callum.reid', '10A'],
  ['u-y10-03', 'Priya Sharma', 'priya.sharma', '10B'],
  ['u-y10-04', 'Jake Morrison', 'jake.morrison', '10B'],
  ['u-y10-05', 'Sophie Chen', 'sophie.chen', '10B'],
  ['u-y10-06', 'Liam Walsh', 'liam.walsh', '10C'],
  ['u-y10-07', 'Fatima Al-Hassan', 'fatima.alhassan', '10C'],
  ['u-y10-08', 'Noah Clarke', 'noah.clarke', '10A'],
  ['u-y10-09', 'Aisha Patel', 'aisha.patel', '10B'],
  ['u-y10-10', 'Dylan Roberts', 'dylan.roberts', '10C'],
  ['u-y10-11', 'Mia Thompson', 'mia.thompson', '10A'],
  ['u-y10-12', 'Aaron Khan', 'aaron.khan', '10C'],
  ['u-y10-13', 'Emma Wilson', 'emma.wilson', '10B'],
  ['u-y10-14', 'Joshua Okafor', 'joshua.okafor', '10A'],
  ['u-y10-15', 'Isabelle Martin', 'isabelle.martin', '10C'],
  ['u-y11-01', 'Tyler Hughes', 'tyler.hughes', '11A'],
  ['u-y11-02', 'Zara Ahmed', 'zara.ahmed', '11B'],
  ['u-y11-03', 'Connor Burke', 'connor.burke', '11A'],
  ['u-y11-04', 'Leila Naseri', 'leila.naseri', '11B'],
  ['u-y11-05', 'Marcus Johnson', 'marcus.johnson', '11C'],
  ['u-y11-06', 'Hannah Lee', 'hannah.lee', '11A'],
  ['u-y11-07', 'Ethan Nguyen', 'ethan.nguyen', '11C'],
  ['u-y11-08', 'Chloe Dubois', 'chloe.dubois', '11B'],
  ['u-y11-09', 'Ryan Cooper', 'ryan.cooper', '11A'],
  ['u-y11-10', 'Nadia Kowalski', 'nadia.kowalski', '11C'],
  ['u-y11-11', 'Samuel Osei', 'samuel.osei', '11B'],
  ['u-y11-12', 'Bethany Ellis', 'bethany.ellis', '11A'],
  ['u-y11-13', 'Kieran Murphy', 'kieran.murphy', '11C'],
  ['u-y11-14', 'Anaya Singh', 'anaya.singh', '11B'],
  ['u-y11-15', 'Leo Fernandez', 'leo.fernandez', '11A'],
  ['u-y12-01', 'Olivia Bennett', 'olivia.bennett', '12A'],
  ['u-y12-02', 'James Carter', 'james.carter', '12A'],
  ['u-y12-03', 'Maya Ramachandran', 'maya.ramachandran', '12B'],
  ['u-y12-04', 'William Scott', 'william.scott', '12B'],
  ['u-y12-05', 'Aria Delgado', 'aria.delgado', '12A'],
  ['u-y12-06', 'Daniel Park', 'daniel.park', '12B'],
  ['u-y12-07', 'Freya Johansson', 'freya.johansson', '12A'],
  ['u-y12-08', 'Alex Mitchell', 'alex.mitchell', '12B'],
  ['u-y12-09', 'Serena Ibrahim', 'serena.ibrahim', '12A'],
  ['u-y12-10', 'Luke Petrov', 'luke.petrov', '12B'],
  ['u-y12-11', 'Imogen Taylor', 'imogen.taylor', '12A'],
  ['u-y12-12', 'Ravi Krishnamurthy', 'ravi.krishnamurthy', '12B']
].map(([id, displayName, local, department]) => ({
  id,
  displayName,
  userPrincipalName: `${local}@contoso.sch.uk`,
  department,
  accountEnabled: true
}))

const staff: [string, string, string][] = [
  ['u-st-01', 'Michael Graves', 'm.graves'],
  ['u-st-02', 'Sarah Nkosi', 's.nkosi'],
  ['u-st-03', 'Tom Lawson', 't.lawson'],
  ['u-st-04', 'Claire Atkins', 'c.atkins'],
  ['u-st-05', 'Paul Yeboah', 'p.yeboah'],
  ['u-st-06', 'Helen Marsh', 'h.marsh'],
  ['u-st-07', 'James Obrien', 'j.obrien'],
  ['u-st-08', 'Priya Mehta', 'p.mehta'],
  ['u-st-09', 'Dave Fowler', 'd.fowler'],
  ['u-st-10', 'Rachel Green', 'r.green']
]
for (const [id, displayName, local] of staff) {
  demoUsers.push({
    id,
    displayName,
    userPrincipalName: `${local}@contoso.sch.uk`,
    department: 'Staff',
    accountEnabled: true
  })
}

export const demoDevices: DemoDevice[] = [
  ['d-lt-001', 'CTX-LT-001', '2026-05-12T09:14:00Z', [['u-y10-01', '2026-05-12T08:55:00Z'], ['u-y10-02', '2026-05-10T13:22:00Z']]],
  ['d-lt-002', 'CTX-LT-002', '2026-05-10T11:30:00Z', [['u-y10-03', '2026-05-10T11:00:00Z'], ['u-y10-04', '2026-05-09T14:10:00Z']]],
  ['d-lt-003', 'CTX-LT-003', '2026-05-08T08:00:00Z', [['u-y10-05', '2026-05-08T07:45:00Z'], ['u-y10-06', '2026-05-07T15:30:00Z']]],
  ['d-lt-004', 'CTX-LT-004', '2026-04-25T14:00:00Z', [['u-y10-07', '2026-04-25T13:50:00Z'], ['u-y10-08', '2026-04-24T09:20:00Z']]],
  ['d-lt-005', 'CTX-LT-005', '2026-04-20T10:45:00Z', [['u-y10-09', '2026-04-20T10:30:00Z'], ['u-y10-10', '2026-04-18T12:00:00Z']]],
  ['d-lt-006', 'CTX-LT-006', '2026-05-02T09:00:00Z', [['u-y11-01', '2026-05-02T08:45:00Z'], ['u-y11-02', '2026-04-30T16:00:00Z']]],
  ['d-lt-007', 'CTX-LT-007', '2026-03-30T08:30:00Z', [['u-y11-03', '2026-03-30T08:20:00Z'], ['u-y11-04', '2026-03-28T14:15:00Z']]],
  ['d-lt-008', 'CTX-LT-008', '2026-03-15T12:00:00Z', [['u-y11-05', '2026-03-15T11:50:00Z'], ['u-y11-06', '2026-03-14T09:30:00Z']]],
  ['d-lt-009', 'CTX-LT-009', '2026-02-20T09:00:00Z', [['u-y12-01', '2026-02-20T08:50:00Z'], ['u-y12-02', '2026-02-18T15:00:00Z']]],
  ['d-lt-010', 'CTX-LT-010', '2025-11-10T10:00:00Z', [['u-y12-03', '2025-11-10T09:45:00Z'], ['u-y12-04', '2025-11-08T13:00:00Z']]],
  ['d-sp-001', 'CTX-SP-001', '2026-05-13T07:30:00Z', [['u-st-01', '2026-05-13T07:20:00Z'], ['u-y12-05', '2026-05-12T16:00:00Z']]],
  ['d-sp-002', 'CTX-SP-002', '2026-05-12T15:00:00Z', [['u-st-02', '2026-05-12T14:50:00Z'], ['u-y12-06', '2026-05-11T10:30:00Z']]],
  ['d-sp-003', 'CTX-SP-003', '2026-05-11T11:00:00Z', [['u-st-03', '2026-05-11T10:45:00Z'], ['u-y11-07', '2026-05-09T14:00:00Z']]],
  ['d-sp-004', 'CTX-SP-004', '2026-04-01T08:00:00Z', [['u-st-04', '2026-04-01T07:55:00Z'], ['u-y11-08', '2026-03-31T16:30:00Z']]],
  ['d-sp-005', 'CTX-SP-005', '2026-05-13T08:45:00Z', [['u-st-05', '2026-05-13T08:40:00Z'], ['u-y12-07', '2026-05-12T12:00:00Z']]],
  ['d-sp-006', 'CTX-SP-006', '2026-03-01T09:00:00Z', [['u-st-06', '2026-03-01T08:55:00Z'], ['u-y10-11', '2026-02-28T15:00:00Z']]],
  ['d-sp-007', 'CTX-SP-007', '2026-05-12T13:00:00Z', [['u-st-07', '2026-05-12T12:55:00Z'], ['u-y12-08', '2026-05-11T09:00:00Z']]],
  ['d-sp-008', 'CTX-SP-008', '2026-05-09T10:00:00Z', [['u-st-08', '2026-05-09T09:50:00Z'], ['u-y11-09', '2026-05-08T14:00:00Z']]],
  ['d-cb-001', 'CTX-CB-001', '2026-05-10T08:00:00Z', [['u-y10-12', '2026-05-10T07:50:00Z']]],
  ['d-cb-002', 'CTX-CB-002', '2026-05-07T09:30:00Z', [['u-y10-13', '2026-05-07T09:20:00Z']]],
  ['d-cb-003', 'CTX-CB-003', '2026-04-28T08:15:00Z', [['u-y10-14', '2026-04-28T08:05:00Z']]],
  ['d-cb-004', 'CTX-CB-004', '2025-12-15T10:00:00Z', [['u-y10-15', '2025-12-15T09:45:00Z']]],
  ['d-cb-005', 'CTX-CB-005', '2026-05-05T11:00:00Z', [['u-y11-10', '2026-05-05T10:50:00Z']]],
  ['d-cb-006', 'CTX-CB-006', '2026-01-08T09:00:00Z', [['u-y11-11', '2026-01-08T08:55:00Z']]],
  ['d-cb-007', 'CTX-CB-007', null, []]
].map(([id, deviceName, lastSyncDateTime, logs]) => ({
  id: id as string,
  deviceName: deviceName as string,
  lastSyncDateTime: lastSyncDateTime as string | null,
  usersLoggedOn: (logs as [string, string][]).map(([userId, lastLogOnDateTime]) => ({
    userId,
    lastLogOnDateTime
  }))
}))

type DemoGroup = { id: string; displayName: string; type: 'Group' | 'Directory Role' }
export const demoGroupCatalog: DemoGroup[] = [
  { id: 'g-all-students', displayName: 'All Students', type: 'Group' },
  { id: 'g-all-staff', displayName: 'All Staff', type: 'Group' },
  { id: 'g-year-10', displayName: 'Year 10', type: 'Group' },
  { id: 'g-year-11', displayName: 'Year 11', type: 'Group' },
  { id: 'g-year-12', displayName: 'Year 12', type: 'Group' },
  { id: 'g-o365-a3', displayName: 'Office 365 A3', type: 'Group' },
  { id: 'g-mfa', displayName: 'MFA Enabled', type: 'Group' },
  { id: 'g-intune', displayName: 'Intune Users', type: 'Group' },
  { id: 'g-global', displayName: 'Global Users', type: 'Directory Role' }
]

export function demoGroupsForUser(userId: string): DemoGroup[] {
  const user = demoUsers.find((u) => u.id === userId)
  if (!user) return []
  const pick = (names: string[]): DemoGroup[] =>
    demoGroupCatalog.filter((g) => names.includes(g.displayName))
  if (user.department === 'Staff') {
    return pick(['All Staff', 'Office 365 A3', 'MFA Enabled', 'Global Users'])
  }
  const year = user.department.startsWith('10')
    ? 'Year 10'
    : user.department.startsWith('11')
      ? 'Year 11'
      : 'Year 12'
  return pick(['All Students', year, 'Office 365 A3', 'MFA Enabled', 'Intune Users'])
}

export function demoSignIns(userId: string): unknown[] {
  const apps = [
    'Microsoft Teams', 'Microsoft SharePoint', 'Microsoft Outlook', 'Azure Portal',
    'Microsoft OneDrive', 'Office 365 Portal', 'Microsoft Exchange Online',
    'Microsoft Forms', 'Microsoft Stream', 'Microsoft Whiteboard'
  ]
  const locations = [
    'London, United Kingdom', 'Manchester, United Kingdom',
    'Birmingham, United Kingdom', 'Bristol, United Kingdom'
  ]
  let devNames = demoDevices
    .filter((d) => d.usersLoggedOn.some((l) => l.userId === userId))
    .map((d) => d.deviceName)
  if (devNames.length === 0) devNames = ['Unknown']

  // Stable per-user seed (mirror of PS GetHashCode-based seeding, simplified).
  let seed = 0
  for (const ch of userId) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
  const base = new Date(Date.UTC(2026, 4, 13, 8, 0, 0)).getTime()
  const rows: unknown[] = []
  for (let i = 0; i < 50; i++) {
    const isFail = (seed + i * 7) % 100 < 15
    const dt = new Date(base - (i * 3 + (seed % 7)) * 3600_000)
    rows.push({
      dateTime: dt.toISOString().slice(0, 16).replace('T', ' '),
      application: apps[(seed + i * 3) % apps.length],
      result: isFail ? 'Failure (50126)' : 'Success',
      failed: isFail,
      ipAddress: `85.213.${((seed + i) % 100) + 100}.${((seed + i * 3) % 200) + 20}`,
      location: locations[(seed + i) % locations.length],
      device: devNames[i % devNames.length]
    })
  }
  return rows
}

// Department → year-group key (mirror of Get-DeptGroup): "10A" → 10, "Staff" → "Staff".
export function deptGroup(dept: string): number | string | null {
  if (!dept) return null
  const m = dept.match(/^(\d+)/)
  return m ? parseInt(m[1], 10) : dept
}
