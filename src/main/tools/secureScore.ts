import { ipcMain } from 'electron'
import { graphGet } from '../graph'
import { mode } from '../mode'

export function registerSecureScoreTool(): void {
  ipcMain.handle('ss:data', async (_e, { tenantId }: { tenantId: string }) => {
    if (mode.demo) {
      return {
        currentScore: 47.06,
        maxScore: 100,
        createdDateTime: '2026-06-10T00:00:00Z',
        controlScores: [
          { controlName: 'MFARegistrationV2', score: 9, maxScore: 9, controlCategory: 'Identity', description: 'Require all users to register for Multi-Factor Authentication', implementationStatus: 'full' },
          { controlName: 'AdminMFAV2', score: 3, maxScore: 10, controlCategory: 'Identity', description: 'Ensure all global admins are protected with MFA', implementationStatus: 'partial' },
          { controlName: 'BlockLegacyAuthentication', score: 0, maxScore: 8, controlCategory: 'Identity', description: 'Block legacy authentication protocols', implementationStatus: 'notStarted' },
          { controlName: 'IntegratedApps', score: 4, maxScore: 4, controlCategory: 'Apps', description: 'Do not allow users to grant consent to unmanaged apps', implementationStatus: 'full' },
          { controlName: 'OneAdmin', score: 0, maxScore: 8, controlCategory: 'Identity', description: 'Limit the number of global admins to less than five', implementationStatus: 'notStarted' },
          { controlName: 'SelfServicePasswordReset', score: 1, maxScore: 1, controlCategory: 'Identity', description: 'Enable self-service password reset', implementationStatus: 'full' },
          { controlName: 'SigninRiskPolicy', score: 0, maxScore: 7, controlCategory: 'Identity', description: 'Enable Azure AD Identity Protection sign-in risk policy', implementationStatus: 'notStarted' },
          { controlName: 'UserRiskPolicy', score: 0, maxScore: 7, controlCategory: 'Identity', description: 'Enable Azure AD Identity Protection user risk policy', implementationStatus: 'notStarted' },
          { controlName: 'PasswordHashSync', score: 5, maxScore: 10, controlCategory: 'Identity', description: 'Enable password hash synchronisation', implementationStatus: 'full' },
          { controlName: 'AuditDataRetention', score: 3, maxScore: 5, controlCategory: 'Data', description: 'Ensure audit log search is enabled in Microsoft 365', implementationStatus: 'partial' },
          { controlName: 'DLPPolicies', score: 0, maxScore: 7, controlCategory: 'Data', description: 'Enable DLP policies', implementationStatus: 'notStarted' },
          { controlName: 'IntuneDeviceCompliance', score: 5, maxScore: 7, controlCategory: 'Device', description: 'Require devices to be marked compliant', implementationStatus: 'partial' },
          { controlName: 'WindowsDefenderATP', score: 5, maxScore: 5, controlCategory: 'Device', description: 'Enable Microsoft Defender for Endpoint', implementationStatus: 'full' },
          { controlName: 'AntiPhishingPolicy', score: 4, maxScore: 5, controlCategory: 'Apps', description: 'Enable anti-phishing policies', implementationStatus: 'partial' },
          { controlName: 'SafeAttachments', score: 4, maxScore: 4, controlCategory: 'Apps', description: 'Enable Safe Attachments for Exchange', implementationStatus: 'full' },
          { controlName: 'SafeLinks', score: 4, maxScore: 4, controlCategory: 'Apps', description: 'Enable Safe Links for Office applications', implementationStatus: 'full' },
        ],
      }
    }

    // Fetch the latest secure score snapshot
    const scoreResp = await graphGet(
      tenantId,
      '/v1.0/security/secureScores?$top=1&$orderby=createdDateTime desc'
    )
    const latest = scoreResp?.value?.[0]
    if (!latest) return null

    // Fetch control profiles for maxScore + implementationStatus
    const profilesResp = await graphGet(tenantId, '/v1.0/security/secureScoreControlProfiles')
    const profiles: any[] = profilesResp?.value ?? []
    const profileMap = new Map(profiles.map((p: any) => [p.id, p]))

    const controlScores = (latest.controlScores ?? []).map((c: any) => {
      const profile = profileMap.get(c.controlName)
      return {
        controlName: c.controlName,
        score: c.score ?? 0,
        maxScore: profile?.maxScore ?? c.maxScore ?? 0,
        controlCategory: profile?.controlCategory ?? c.controlCategory ?? 'Other',
        description: profile?.title ?? c.description ?? c.controlName,
        implementationStatus: c.implementationStatus ?? 'notStarted'
      }
    })

    return {
      currentScore: latest.currentScore ?? 0,
      maxScore: latest.maxScore ?? 0,
      createdDateTime: latest.createdDateTime ?? '',
      controlScores
    }
  })
}
