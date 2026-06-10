import { ipcMain } from 'electron'
import { graphGet, graphPost, graphDelete, GraphError } from '../graph'
import { getExchangeToken } from '../auth'
import { mode } from '../mode'

// ── EWS helpers ───────────────────────────────────────────────────────────────

const EWS_URL = 'https://outlook.office365.com/EWS/Exchange.asmx'

async function ewsRequest(token: string, action: string, bodyXml: string): Promise<string> {
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
  xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
  xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <t:RequestServerVersion Version="Exchange2016"/>
  </soap:Header>
  <soap:Body>
${bodyXml}
  </soap:Body>
</soap:Envelope>`

  const res = await fetch(EWS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: `"http://schemas.microsoft.com/exchange/services/2006/messages/${action}"`
    },
    body: envelope
  })

  const text = await res.text()
  if (!res.ok) throw new Error(`EWS HTTP ${res.status}: ${text.slice(0, 400)}`)

  // Surface SOAP faults as readable errors
  if (/<faultcode/i.test(text) || /:Fault>/i.test(text)) {
    const msg = /<faultstring>([^<]*)/i.exec(text)?.[1] ?? 'Unknown EWS fault'
    throw new Error(`EWS: ${msg}`)
  }

  return text
}

/** First match of a namespaced XML element's text content */
function ewsText(xml: string, localName: string): string {
  const m = new RegExp(`<[a-zA-Z]+:${localName}[^>]*>([^<]*)<`, 'i').exec(xml)
  return m ? m[1].trim() : ''
}

/** All occurrences of a namespaced block's inner XML */
function ewsBlocks(xml: string, localName: string): string[] {
  const re = new RegExp(
    `<[a-zA-Z]+:${localName}[^>]*>([\\s\\S]*?)<\\/[a-zA-Z]+:${localName}>`,
    'gi'
  )
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) out.push(m[1])
  return out
}

export type EwsDelegate = {
  email: string
  displayName: string
  inbox: string
  calendar: string
  contacts: string
  tasks: string
}

async function ewsGetDelegates(token: string, mailboxEmail: string): Promise<EwsDelegate[]> {
  const xml = await ewsRequest(
    token,
    'GetDelegate',
    `    <m:GetDelegate IncludePermissions="true">
      <m:Mailbox>
        <t:EmailAddress>${mailboxEmail}</t:EmailAddress>
      </m:Mailbox>
    </m:GetDelegate>`
  )

  const delegates: EwsDelegate[] = []
  for (const block of ewsBlocks(xml, 'DelegateUser')) {
    const email = ewsText(block, 'PrimarySmtpAddress')
    if (!email) continue
    delegates.push({
      email,
      displayName: ewsText(block, 'DisplayName') || email,
      inbox:    ewsText(block, 'InboxFolderPermissionLevel')    || 'None',
      calendar: ewsText(block, 'CalendarFolderPermissionLevel') || 'None',
      contacts: ewsText(block, 'ContactsFolderPermissionLevel') || 'None',
      tasks:    ewsText(block, 'TasksFolderPermissionLevel')    || 'None',
    })
  }
  return delegates
}

// Mirrors Outlook's default "full delegate" settings: Editor on Inbox + Calendar,
// Reviewer on Contacts. Tasks/Notes/Journal stay None.
async function ewsAddDelegate(
  token: string,
  mailboxEmail: string,
  delegateEmail: string
): Promise<void> {
  await ewsRequest(
    token,
    'AddDelegate',
    `    <m:AddDelegate>
      <m:Mailbox>
        <t:EmailAddress>${mailboxEmail}</t:EmailAddress>
      </m:Mailbox>
      <m:DelegateUsers>
        <t:DelegateUser>
          <t:UserId>
            <t:PrimarySmtpAddress>${delegateEmail}</t:PrimarySmtpAddress>
          </t:UserId>
          <t:DelegatePermissions>
            <t:CalendarFolderPermissionLevel>Editor</t:CalendarFolderPermissionLevel>
            <t:TasksFolderPermissionLevel>None</t:TasksFolderPermissionLevel>
            <t:InboxFolderPermissionLevel>Editor</t:InboxFolderPermissionLevel>
            <t:ContactsFolderPermissionLevel>Reviewer</t:ContactsFolderPermissionLevel>
            <t:NotesFolderPermissionLevel>None</t:NotesFolderPermissionLevel>
            <t:JournalFolderPermissionLevel>None</t:JournalFolderPermissionLevel>
          </t:DelegatePermissions>
          <t:ReceiveCopiesOfMeetingMessages>false</t:ReceiveCopiesOfMeetingMessages>
          <t:ViewPrivateItems>false</t:ViewPrivateItems>
        </t:DelegateUser>
      </m:DelegateUsers>
    </m:AddDelegate>`
  )
}

async function ewsRemoveDelegate(
  token: string,
  mailboxEmail: string,
  delegateEmail: string
): Promise<void> {
  await ewsRequest(
    token,
    'RemoveDelegate',
    `    <m:RemoveDelegate>
      <m:Mailbox>
        <t:EmailAddress>${mailboxEmail}</t:EmailAddress>
      </m:Mailbox>
      <m:UserIds>
        <t:UserId>
          <t:PrimarySmtpAddress>${delegateEmail}</t:PrimarySmtpAddress>
        </t:UserId>
      </m:UserIds>
    </m:RemoveDelegate>`
  )
}

// ── IPC handlers ──────────────────────────────────────────────────────────────

export type Delegate = {
  id: string
  displayName: string
  userPrincipalName: string
}

export function registerMailboxDelegationTool(): void {
  // ── Send on Behalf (publicDelegates — Graph) ────────────────────────────────
  // 404 = user has no Exchange Online mailbox → return empty, don't throw.
  ipcMain.handle(
    'mbx:sendOnBehalf',
    async (_e, { tenantId, userId }: { tenantId: string; userId: string }) => {
      if (mode.demo) {
        return [
          { id: 'u-st-02', displayName: 'Sarah Nkosi', userPrincipalName: 's.nkosi@contoso.sch.uk' }
        ] as Delegate[]
      }
      try {
        const resp = await graphGet(tenantId, `/v1.0/users/${userId}/publicDelegates`)
        return ((resp?.value ?? []) as any[]).map((u) => ({
          id: u.id,
          displayName: u.displayName ?? u.mail ?? u.id,
          userPrincipalName: u.userPrincipalName ?? u.mail ?? ''
        })) as Delegate[]
      } catch (e) {
        if (e instanceof GraphError && e.status === 404) return [] as Delegate[]
        throw e
      }
    }
  )

  ipcMain.handle(
    'mbx:addSendOnBehalf',
    async (_e, { tenantId, userId, delegateId }: { tenantId: string; userId: string; delegateId: string }) => {
      if (mode.dry || mode.demo) return { ok: true, dry: true }
      await graphPost(tenantId, `/v1.0/users/${userId}/publicDelegates/$ref`, {
        '@odata.id': `https://graph.microsoft.com/v1.0/users/${delegateId}`
      })
      return { ok: true, dry: false }
    }
  )

  ipcMain.handle(
    'mbx:removeSendOnBehalf',
    async (_e, { tenantId, userId, delegateId }: { tenantId: string; userId: string; delegateId: string }) => {
      if (mode.dry || mode.demo) return { ok: true, dry: true }
      await graphDelete(tenantId, `/v1.0/users/${userId}/publicDelegates/${delegateId}/$ref`)
      return { ok: true, dry: false }
    }
  )

  // ── Read and Manage — EWS delegate (Inbox + Calendar + Contacts + Tasks) ────
  // Uses Exchange Web Services for proper Outlook-style delegation.
  // ownerUpn = the mailbox owner's UPN (used as email address for EWS).
  ipcMain.handle(
    'mbx:fullAccess',
    async (_e, { tenantId, ownerUpn }: { tenantId: string; ownerUpn: string }) => {
      if (mode.demo) {
        return [
          {
            email: 't.lawson@contoso.sch.uk',
            displayName: 'Tom Lawson',
            inbox: 'Editor',
            calendar: 'Editor',
            contacts: 'Reviewer',
            tasks: 'None'
          }
        ] as EwsDelegate[]
      }
      const token = await getExchangeToken(tenantId)
      return ewsGetDelegates(token, ownerUpn)
    }
  )

  ipcMain.handle(
    'mbx:addFullAccess',
    async (
      _e,
      { tenantId, ownerUpn, delegateEmail }: { tenantId: string; ownerUpn: string; delegateEmail: string }
    ) => {
      if (mode.dry || mode.demo) return { ok: true, dry: true }
      const token = await getExchangeToken(tenantId)
      await ewsAddDelegate(token, ownerUpn, delegateEmail)
      return { ok: true, dry: false }
    }
  )

  ipcMain.handle(
    'mbx:removeFullAccess',
    async (
      _e,
      { tenantId, ownerUpn, delegateEmail }: { tenantId: string; ownerUpn: string; delegateEmail: string }
    ) => {
      if (mode.dry || mode.demo) return { ok: true, dry: true }
      const token = await getExchangeToken(tenantId)
      await ewsRemoveDelegate(token, ownerUpn, delegateEmail)
      return { ok: true, dry: false }
    }
  )
}
