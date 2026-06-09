export type Tenant = {
  tenantId: string
  displayName: string
  accountHint?: string
}

export type ConnectResult = {
  account: string
  tenantId: string
  cachePersisted: boolean
  mode: 'silent' | 'interactive'
}

export type GraphUser = {
  id: string
  displayName: string
  userPrincipalName: string
}

export type LogColor =
  | 'Text'
  | 'TextDim'
  | 'Muted'
  | 'Success'
  | 'Danger'
  | 'Warning'
  | 'Accent'
