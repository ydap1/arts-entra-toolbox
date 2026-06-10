import { ipcMain } from 'electron'
import { graphGet, graphPost, graphPaged } from '../graph'
import { mode } from '../mode'

// Friendly names for the most common M365 Education / Business SKU IDs.
const SKU_NAMES: Record<string, string> = {
  '94763226-9b3c-4e75-a931-5c89701abe66': 'Microsoft 365 A1 for Students',
  'e82ae690-a2d5-4d76-8d30-7c6e01e6022e': 'Microsoft 365 A1 for Faculty',
  '98b6e773-24d4-4c0d-a968-6e787a1f8204': 'Microsoft 365 A3 for Students',
  '4b590615-0888-425a-a965-b3bf7789848d': 'Microsoft 365 A3 for Faculty',
  'e97c048c-37a4-45a3-847a-8a8120311f73': 'Microsoft 365 A5 for Students',
  '8bb87f59-f272-4705-bea4-ac22e5abab40': 'Microsoft 365 A5 for Faculty',
  '05e9a617-0261-4cee-bb44-138d3ef5d965': 'Microsoft 365 E3',
  '06ebc4ee-1bb5-47dd-8120-11324bc54e06': 'Microsoft 365 E5',
  '6fd2c87f-b296-42f0-b197-1e91e994b900': 'Office 365 E3',
  '18181a46-0d4e-45cd-891e-60aabd171b4e': 'Office 365 E1',
  'f30db892-07e9-47e9-837c-80727f46fd3d': 'Microsoft Flow Free',
  'a403ebcc-fae0-4ca2-8c8c-7a907fd6c235': 'Power BI (free)',
  'b05e124f-c7cc-45a0-a6aa-8cf78c946968': 'Enterprise Mobility + Security A3 for Faculty',
  'efccb6f7-5641-4e0e-bd10-b4976e1bf68e': 'Enterprise Mobility + Security E3',
  '1e7e1070-8ccb-4aca-b470-d7cb538cb07e': 'Teams Essentials',
  '87bbbc60-4754-4998-8c88-227dca264858': 'PowerApps per User Plan',
  'dcb1a3ae-b33f-4487-846a-a640262fadf4': 'Azure AD Premium P2',
  '078d2b04-f1bd-4111-bbd4-b4b1b354cef4': 'Azure AD Premium P1',
}

function friendly(skuPartNumber: string, skuId: string): string {
  return SKU_NAMES[skuId] ?? skuPartNumber.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function registerLicensesTool(): void {
  // List all subscribed SKUs in the tenant
  ipcMain.handle('lic:skus', async (_e, { tenantId }: { tenantId: string }) => {
    if (mode.demo) {
      return [
        { skuId: 'sku-a1-students', skuPartNumber: 'MICROSOFT_365_A1_FOR_STUDENTS', friendlyName: 'Microsoft 365 A1 for Students', consumedUnits: 892, prepaidUnits: { enabled: 1000 } },
        { skuId: 'sku-a1-faculty', skuPartNumber: 'MICROSOFT_365_A1_FOR_FACULTY', friendlyName: 'Microsoft 365 A1 for Faculty', consumedUnits: 48, prepaidUnits: { enabled: 50 } },
        { skuId: 'sku-ems-a3', skuPartNumber: 'EMSA3_FACULTY', friendlyName: 'Enterprise Mobility + Security A3 for Faculty', consumedUnits: 48, prepaidUnits: { enabled: 50 } },
      ]
    }
    const skus = await graphPaged(tenantId, '/v1.0/subscribedSkus?$select=skuId,skuPartNumber,consumedUnits,prepaidUnits')
    return skus.map((s: any) => ({ ...s, friendlyName: friendly(s.skuPartNumber, s.skuId) }))
  })

  // List licenses assigned to a specific user
  ipcMain.handle('lic:userLicenses', async (_e, { tenantId, userId }: { tenantId: string; userId: string }) => {
    if (mode.demo) {
      return [
        { skuId: 'sku-a1-students', skuPartNumber: 'MICROSOFT_365_A1_FOR_STUDENTS', friendlyName: 'Microsoft 365 A1 for Students' },
        { skuId: 'sku-ems-a3', skuPartNumber: 'EMSA3_FACULTY', friendlyName: 'Enterprise Mobility + Security A3 for Faculty' },
      ]
    }
    const resp = await graphGet(tenantId, `/v1.0/users/${userId}/licenseDetails?$select=skuId,skuPartNumber`)
    const list = Array.isArray(resp?.value) ? resp.value : []
    return list.map((l: any) => ({ ...l, friendlyName: friendly(l.skuPartNumber, l.skuId) }))
  })

  // Assign or remove licenses from a user (addSkuIds / removeSkuIds)
  ipcMain.handle('lic:assign', async (
    _e,
    { tenantId, userId, addSkuIds, removeSkuIds }: { tenantId: string; userId: string; addSkuIds: string[]; removeSkuIds: string[] }
  ) => {
    if (mode.dry || mode.demo) return { ok: true, dry: true }
    await graphPost(tenantId, `/v1.0/users/${userId}/assignLicense`, {
      addLicenses: addSkuIds.map((id) => ({ skuId: id })),
      removeLicenses: removeSkuIds
    })
    return { ok: true, dry: false }
  })
}
