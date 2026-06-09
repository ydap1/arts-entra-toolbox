# Art's Entra Toolbox — Electron Edition

> **Note:** This tool was built for my own specific IT workflow managing school Entra ID tenants. It is published publicly for reference but may be completely useless for your use case.

Electron + React + TypeScript rewrite of the original WPF PowerShell toolbox. A desktop GUI for Entra ID (Azure AD) tenant management. No Azure app registration required — it uses the well-known Microsoft Intune PowerShell public client ID with interactive MSAL sign-in.

## Tools

| Tool | Category | Description |
|------|----------|-------------|
| **Year Group Passwords** | Users | Bulk password reset by department. Memorable password generation, dry-run preview, CSV export. |
| **User Password Reset** | Users | Single-account password reset with `forceChangePasswordNextSignIn` toggle and group membership view. |
| **Bulk UPN Change** | Users | Move cloud-only users to a different verified domain. Import by department or individual search. |
| **Immutable ID** | Users | Assign or remove `onPremisesImmutableId` on cloud-only accounts, with per-row selection and confirm gate. |
| **Last Device** | Devices | Intune device lookup by user or by device name. Stale device filter (7 / 30 / 60 / 90 days). |
| **Sign-In Logs** | Audit | Last 50 sign-ins for any user — app, result, IP, location, device. |
| **Group Copy** | Groups & Teams | Copy all group memberships from one user to another. Skips groups the target already belongs to. |
| **Teams Provisioning** | Groups & Teams | Create a Class or Standard team, populate from a year group or direct user search, assign per-person Owner roles. |

Multi-tenant. Profiles are saved locally and the MSAL token cache is persisted (DPAPI-encrypted where available) — no re-authentication unless the refresh token expires.

## Architecture

Electron three-process split:

- **Main** (`src/main`) — Node side. Owns MSAL auth, the token cache, and all Microsoft Graph calls. Access tokens never leave this process.
- **Preload** (`src/preload`) — exposes a minimal `window.bridge.invoke(channel, payload)` + log subscription over the context bridge.
- **Renderer** (`src/renderer`) — React UI. Talks to the main process only through typed IPC (`api.invoke<T>(channel, payload)`).

Each tool registers its own IPC handlers in the main process (`registerXxxTool()`) and has a matching React component in `src/renderer/src/tools`. Destructive handlers branch on **Dry Run** and **Demo** modes and report per-row results so the UI can show live progress.

## Development

Requires Node.js. Install dependencies, then:

```bash
npm run dev        # launch with hot reload
npm run typecheck  # tsc --noEmit
npm run build      # production bundle into out/
npm run package    # build + electron-builder (unpacked Windows app)
npm run dist       # build + electron-builder installer
```

Add a tenant with the **+** button — enter your Tenant ID, sign in interactively, done. Subsequent launches connect silently. Use **Dry Run** in the tenant bar to preview destructive actions without executing them, or **Demo** to explore the fake "Contoso Academy" tenant with no real connection.

## Permissions

All scopes are requested together at first interactive sign-in:

| Scope | Purpose |
|-------|---------|
| `User.ReadWrite.All` | Read users, reset passwords, change UPNs, set ImmutableId |
| `DeviceManagementManagedDevices.Read.All` | Last Device tab |
| `AuditLog.Read.All` | Sign-In Logs tab |
| `GroupMember.ReadWrite.All` | Group membership view and Group Copy |
| `Team.Create` | Create new Teams |
| `TeamMember.ReadWrite.All` | Add members and owners to Teams |

## License

MIT
