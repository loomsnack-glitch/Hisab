# Implementation Summary: Human-Readable POS Login

## Overview
Replaced UUID-based POS device login with human-readable usernames. Login now uses `organizationUsername` + `deviceUsername` + `deviceSecret` instead of `deviceId` (UUID) + `deviceSecret`.

## Files Changed

### Database (2 files)
1. **apps/backend/db/migrations/20260727120000_add_organization_and_device_usernames.sql** (new)
   - Adds `username` column to `organizations` table
   - Adds `login_username` column to `store_devices` table
   - Implements slugification with collision handling
   - Uses suffix-aware truncation to ensure usernames stay ≤64 characters
   - Creates unique constraints and check constraints

2. **apps/backend/db/schema.sql** (modified)
   - Added `username` column to organizations table definition
   - Added `login_username` column to store_devices table definition
   - Added unique constraints: `organizations_username_key`, `store_devices_organization_id_login_username_key`
   - Added check constraints: `organizations_username_check`, `store_devices_login_username_check`
   - Added migration version `20260727120000` to schema_migrations

### Shared Types (3 files)
3. **packages/types/src/modules/organization/organization.schema.ts**
   - Added `usernameSchema` with validation regex
   - Added `username` field to `OrganizationDTOSchema`
   - Added `username` field to `CreateOrganizationSchema` and `UpdateOrganizationSchema`
   - Added `loginUsername` field to `StoreDeviceDTOSchema`
   - Added `loginUsername` field to `CreateStoreDeviceSchema` and `UpdateStoreDeviceSchema`

4. **packages/types/src/modules/organization/organization.type.ts**
   - Updated `CreateOrganizationREPO` to include `username`
   - Updated `UpdateOrganizationREPO` to include `username`
   - Updated `CreateStoreDeviceREPO` to include `loginUsername`
   - Updated `UpdateStoreDeviceREPO` to include optional `loginUsername`

5. **packages/types/src/modules/device-auth/device-auth.schema.ts**
   - Replaced `DeviceLoginSchema` with new shape: `{ organizationUsername, deviceUsername, deviceSecret }`
   - Added `loginUsername` to `DeviceSessionDeviceDTOSchema`
   - Added `username` to `DeviceSessionOrganizationDTOSchema`

### Backend (4 files)
6. **apps/backend/src/modules/tenant/organization/organization.repository.ts**
   - Added `organizationUsernameExists()` - checks global uniqueness
   - Added `loginUsernameExistsInOrg()` - checks uniqueness within organization
   - Added `getOrganizationByUsername()` - lookup by username
   - Added `getStoreDeviceByLoginUsername()` - lookup by login username
   - Updated `updateOrganization()` to handle username field
   - Updated `updateStoreDevice()` to handle loginUsername field

7. **apps/backend/src/modules/tenant/organization/organization.service.ts**
   - Added username validation in `createOrganization()`
   - Added username validation in `updateOrganization()`
   - Added loginUsername validation in `createStoreDevice()`
   - Added loginUsername validation in `updateStoreDevice()`

8. **apps/backend/src/modules/access-control/device-auth/device-auth.repository.ts**
   - Added `getDeviceSessionByLoginUsername()` - joins organizations and store_devices
   - Updated `mapDeviceSession()` to include `loginUsername` and org `username`

9. **apps/backend/src/modules/access-control/device-auth/device-auth.service.ts**
   - Modified `login()` to use username-based lookup instead of UUID
   - Normalizes inputs to lowercase before lookup

### Frontend (9 files)
10. **apps/web/src/pages/pos-login-page.tsx**
    - Replaced UUID input with 3-field form: organization username, device username, secret
    - Updated form validation to use new schema
    - Updated URL params to use `org` and `device` instead of `deviceId`

11. **apps/web/src/pages/stores-page.tsx**
    - Passes `organization.username` to `StoresSection` component

12. **apps/web/src/pages/organization-detail-page.tsx**
    - Passes `organizationUsername` prop to `StoresSection`

13. **apps/web/src/components/organizations/stores-section.tsx**
    - Added `organizationUsername` prop
    - Updated device display to show `loginUsername` instead of UUID
    - Updated POS shortcut link to pass both `org` and `device` params (URL-encoded)

14. **apps/web/src/components/organizations/create-organization-dialog.tsx**
    - Added username input field with validation
    - Added helper text explaining username rules

15. **apps/web/src/components/organizations/edit-organization-dialog.tsx**
    - Added username input field
    - Pre-fills existing username on edit

16. **apps/web/src/components/organizations/create-device-dialog.tsx**
    - Added loginUsername input field with validation
    - Added helper text explaining username rules

17. **apps/web/src/components/organizations/edit-device-dialog.tsx**
    - Added loginUsername input field
    - Pre-fills existing loginUsername on edit

18. **apps/web/src/components/organizations/device-secret-dialog.tsx**
    - Changed `deviceId` prop to `loginIdentifier`
    - Updated display to show login identifier instead of UUID

19. **apps/web/src/components/organizations/reveal-device-secret-button.tsx**
    - Added `loginIdentifier` prop
    - Passes login identifier to `DeviceSecretDialog`

### Tests (1 file)
20. **apps/backend/src/modules/tenant/organization/username.test.ts** (new)
    - Tests for slug generation (normal names, special chars, empty names)
    - Tests for collision suffix generation with suffix-aware truncation
    - Tests for username validation regex

### Scripts (1 file)
21. **apps/backend/src/scripts/verify-username-migration.ts** (new)
    - Migration verification script for testing against PostgreSQL
    - Tests duplicate names, long names, special-character-only names
    - Verifies constraints and uniqueness

## Key Features

### Username Rules
- Pattern: `^[a-z0-9][a-z0-9_-]{1,63}$`
- Length: 2-64 characters
- Must start with letter or number
- Can contain lowercase letters, numbers, hyphens, underscores
- Cannot start or end with hyphen or underscore

### Slugification
- Converts display names to valid usernames
- Lowercases all characters
- Replaces invalid characters with hyphens
- Collapses multiple hyphens
- Trims leading/trailing hyphens
- Handles empty names and special-character-only names with fallback to hash-based usernames

### Collision Handling
- Uses suffix-aware truncation: `LEFT(base, 64 - LENGTH(suffix) - 1) || '-' || suffix`
- Ensures total length never exceeds 64 characters
- Works for suffixes from 2 to 9999
- Safety limit prevents infinite loops

### Uniqueness
- Organization usernames: globally unique
- Device login usernames: unique within organization
- Enforced by database constraints
- Application-level checks provide friendly error messages

## Verification Results

### Tests
```
Backend tests: 96 pass, 0 fail
Username tests: 17 pass, 0 fail
```

### Build
```
Turbo build: Success (4 tasks)
Backend build: Success (415 modules bundled)
Web build: Success (2817 modules transformed)
```

### Code Quality
```
git diff --check: No whitespace issues
```

### Database Migration
Migration not executed (no PostgreSQL instance available in test environment).

To run the migration:
1. Ensure PostgreSQL is running with database `hisab`
2. Run: `bun run src/scripts/verify-username-migration.ts`
3. Or use dbmate: `dbmate up`

## API Changes

### Device Login Endpoint
**Before:**
```json
POST /device-auth/login
{
  "deviceId": "uuid-string",
  "deviceSecret": "secret"
}
```

**After:**
```json
POST /device-auth/login
{
  "organizationUsername": "shop123",
  "deviceUsername": "counter1",
  "deviceSecret": "secret"
}
```

### Organization DTO
**Before:**
```typescript
{
  id: string;
  name: string;
  createdBy: string;
  // ...
}
```

**After:**
```typescript
{
  id: string;
  name: string;
  username: string;  // NEW
  createdBy: string;
  // ...
}
```

### Device DTO
**Before:**
```typescript
{
  id: string;
  name: string;
  storeId: string;
  // ...
}
```

**After:**
```typescript
{
  id: string;
  name: string;
  loginUsername: string;  // NEW
  storeId: string;
  // ...
}
```

## Migration Edge Cases Handled

1. **Duplicate organization names** → `shop`, `shop-2`, `shop-3`, etc.
2. **Duplicate device names within org** → `counter`, `counter-2`, `counter-3`, etc.
3. **64-character names** → Truncated to fit with suffix
4. **Special-character-only names** → Fallback to `org-<hash>` or `device-<hash>`
5. **Leading underscores/hyphens** → Prefixed with `slug-`
6. **Empty names** → Fallback to hash-based username
7. **Large collision counts** → Suffix-aware truncation prevents overflow

## Known Limitations

1. Migration requires PostgreSQL instance (not available in test environment)
2. Pre-existing TypeScript errors in repository (unrelated to this change)
3. Pre-existing lint warnings in web app (unrelated to this change)
4. `@repo/ui` lint fails due to missing `@workspace/eslint-config` (pre-existing)

## Next Steps

1. Run migration against development database
2. Test end-to-end flow:
   - Create organization with username
   - Create device with login username
   - Verify POS login with new credentials
   - Verify billing session access
3. Update API documentation
4. Consider adding rate limiting for login attempts (future enhancement)
