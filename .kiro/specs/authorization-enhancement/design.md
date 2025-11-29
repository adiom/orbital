# Design Document

## Overview

This design document outlines the implementation of a comprehensive authorization system for Avrora Area. The system will provide centralized, role-based access control (RBAC) for all platform resources including Sferas, messages, artifacts, and MCP API access. The design emphasizes performance through caching, maintainability through clean architecture, and security through comprehensive audit logging.

The authorization system will be implemented as a standalone service module that can be imported and used throughout the application. It will integrate with the existing NextAuth session management and database schema while adding new authorization-specific functionality.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Routes / UI                          │
│  (app/api/sfera/*, app/(orbit)/*, components/*)             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Authorization Service                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Permission   │  │ Role         │  │ Audit        │     │
│  │ Checker      │  │ Manager      │  │ Logger       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Cache        │  │ Policy       │  │ MCP Auth     │     │
│  │ Manager      │  │ Engine       │  │ Handler      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Layer                              │
│  (Drizzle ORM + PostgreSQL)                                 │
│  - sferaMember, apiKey, authorizationLog, user              │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

**Authorization Service**: Main entry point for all authorization checks. Coordinates between sub-components.

**Permission Checker**: Evaluates whether a user has permission to perform an action on a resource.

**Role Manager**: Manages role assignments, role changes, and ownership transfers.

**Audit Logger**: Records all authorization decisions and role changes for security auditing.

**Cache Manager**: Implements caching strategy for permissions and roles to optimize performance.

**Policy Engine**: Defines and evaluates authorization policies based on roles and resource types.

**MCP Auth Handler**: Specialized handler for API key-based authentication and authorization.

## Components and Interfaces

### 1. Authorization Service Interface

```typescript
// lib/auth/authorization.ts

export interface AuthorizationContext {
  userId: string;
  userType: 'guest' | 'regular';
  apiKeyId?: string; // For MCP requests
}

export interface ResourceIdentifier {
  type: 'sfera' | 'message' | 'artifact' | 'user' | 'api_key';
  id: string;
  parentId?: string; // For nested resources (e.g., message in sfera)
}

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: string;
}

export interface AuthorizationService {
  // Core permission checking
  can(
    context: AuthorizationContext,
    action: string,
    resource: ResourceIdentifier
  ): Promise<AuthorizationResult>;

  // Batch permission checking
  canBatch(
    context: AuthorizationContext,
    checks: Array<{ action: string; resource: ResourceIdentifier }>
  ): Promise<AuthorizationResult[]>;

  // Get user capabilities for a resource
  getCapabilities(
    context: AuthorizationContext,
    resource: ResourceIdentifier
  ): Promise<string[]>;

  // Role management
  assignRole(
    actorContext: AuthorizationContext,
    targetUserId: string,
    resource: ResourceIdentifier,
    role: string
  ): Promise<void>;

  revokeRole(
    actorContext: AuthorizationContext,
    targetUserId: string,
    resource: ResourceIdentifier
  ): Promise<void>;

  transferOwnership(
    actorContext: AuthorizationContext,
    resource: ResourceIdentifier,
    newOwnerId: string
  ): Promise<void>;

  // Query user's role
  getUserRole(
    userId: string,
    resource: ResourceIdentifier
  ): Promise<string | null>;
}
```

### 2. Policy Engine

```typescript
// lib/auth/policy-engine.ts

export type Action =
  | 'sfera:view'
  | 'sfera:message'
  | 'sfera:edit'
  | 'sfera:delete'
  | 'sfera:manage_members'
  | 'sfera:fork'
  | 'message:create'
  | 'message:edit'
  | 'message:delete'
  | 'artifact:create'
  | 'artifact:view'
  | 'artifact:edit';

export type Role = 'owner' | 'admin' | 'member' | 'viewer' | 'guest';

export interface Policy {
  role: Role;
  actions: Action[];
}

export interface PolicyEngine {
  // Check if role has permission for action
  isAllowed(role: Role, action: Action): boolean;

  // Get all actions allowed for a role
  getAllowedActions(role: Role): Action[];

  // Get minimum role required for action
  getRequiredRole(action: Action): Role;
}
```

### 3. Cache Manager

```typescript
// lib/auth/cache-manager.ts

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface CacheManager {
  // Get cached role
  getRole(userId: string, resourceId: string): Promise<string | null>;

  // Set cached role
  setRole(userId: string, resourceId: string, role: string): Promise<void>;

  // Invalidate role cache
  invalidateRole(userId: string, resourceId: string): Promise<void>;

  // Invalidate all caches for a resource
  invalidateResource(resourceId: string): Promise<void>;

  // Get cached permission result
  getPermission(
    userId: string,
    action: string,
    resourceId: string
  ): Promise<boolean | null>;

  // Set cached permission result
  setPermission(
    userId: string,
    action: string,
    resourceId: string,
    allowed: boolean
  ): Promise<void>;
}
```

### 4. Audit Logger

```typescript
// lib/auth/audit-logger.ts

export interface AuditLogEntry {
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  allowed: boolean;
  reason?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface RoleChangeEntry {
  actorId: string;
  targetUserId: string;
  resourceType: string;
  resourceId: string;
  oldRole?: string;
  newRole: string;
  timestamp: Date;
}

export interface AuditLogger {
  logAuthorizationCheck(entry: AuditLogEntry): Promise<void>;
  logRoleChange(entry: RoleChangeEntry): Promise<void>;
  getAuditLog(filters: {
    userId?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditLogEntry[]>;
}
```

## Data Models

### New Database Tables

```typescript
// lib/db/schema.ts additions

// Authorization audit log
export const authorizationLog = pgTable("AuthorizationLog", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resourceType", { length: 50 }).notNull(),
  resourceId: uuid("resourceId").notNull(),
  allowed: boolean("allowed").notNull(),
  reason: text("reason"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// Role change audit log
export const roleChangeLog = pgTable("RoleChangeLog", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  actorId: uuid("actorId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  targetUserId: uuid("targetUserId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  resourceType: varchar("resourceType", { length: 50 }).notNull(),
  resourceId: uuid("resourceId").notNull(),
  oldRole: varchar("oldRole", { length: 50 }),
  newRole: varchar("newRole", { length: 50 }).notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// Indexes for performance
// CREATE INDEX idx_authorization_log_user ON "AuthorizationLog"("userId", "createdAt");
// CREATE INDEX idx_authorization_log_resource ON "AuthorizationLog"("resourceId", "createdAt");
// CREATE INDEX idx_role_change_log_target ON "RoleChangeLog"("targetUserId", "createdAt");
// CREATE INDEX idx_sfera_member_lookup ON "SferaMember"("sferaId", "userId");
```

### Enhanced Existing Tables

The existing `sferaMember` table already supports roles. We'll add indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_sfera_member_user ON "SferaMember"("userId");
CREATE INDEX IF NOT EXISTS idx_sfera_member_sfera ON "SferaMember"("sferaId");
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, I've identified several redundant properties that can be consolidated:

- Properties 1.2 and 6.1 both test that permission checks are logged - these can be combined
- Properties 5.5 and 6.4 both test that API key usage is logged - these can be combined
- Multiple properties test role-based permissions (2.1-2.5, 3.2-3.5) - these follow the same pattern and can be tested with a single comprehensive property

The consolidated properties below eliminate redundancy while maintaining complete coverage.

### Core Authorization Properties

**Property 1: Permission check logging completeness**
*For any* permission check performed by the Authorization System, a log entry should be created containing userId, resourceType, resourceId, action, timestamp, result, and reason (if denied).
**Validates: Requirements 1.2, 6.1**

**Property 2: Authorization rule updates are immediate**
*For any* authorization rule update, subsequent permission checks should reflect the new rule without system restart.
**Validates: Requirements 1.3**

**Property 3: Failed permission checks include denial reason**
*For any* permission check that returns `allowed: false`, the result should include a non-empty `reason` field explaining why access was denied.
**Validates: Requirements 1.5, 7.2**

### Role-Based Access Control Properties

**Property 4: Role hierarchy for Sfera access**
*For any* Sfera and any action, if a user with role R can perform the action, then a user with a higher-privilege role should also be able to perform that action (where owner > admin > member > viewer in privilege hierarchy).
**Validates: Requirements 2.1, 2.2, 2.3, 2.5, 3.2, 3.3, 3.4, 3.5**

**Property 5: Owner-only deletion**
*For any* Sfera, only a user with the owner role should be able to perform the `sfera:delete` action.
**Validates: Requirements 2.4**

**Property 6: Viewer role is read-only**
*For any* user with viewer role on a Sfera, all write actions (`sfera:message`, `sfera:edit`, `message:create`, `artifact:create`) should be denied.
**Validates: Requirements 3.5**

### Guest User Properties

**Property 7: Guest user restrictions**
*For any* user with type 'guest', actions `sfera:create`, `message:create`, `sfera:fork`, and `sfera:message` should be denied regardless of the resource.
**Validates: Requirements 4.2, 4.3, 4.4**

**Property 8: Guest public Sfera access**
*For any* Sfera with visibility 'public', a guest user should be allowed to perform `sfera:view` action.
**Validates: Requirements 4.1**

**Property 9: Guest session expiration**
*For any* guest user whose session has expired, all permission checks should return `allowed: false`.
**Validates: Requirements 4.5**

### API Key Properties

**Property 10: API key permission enforcement**
*For any* MCP request authenticated with an API key, the action should be allowed only if the API key's permissions object grants access to the requested operation type (resources/tools/admin).
**Validates: Requirements 5.2**

**Property 11: Revoked API key rejection**
*For any* API key where `revokedAt` is not null, all authorization checks using that key should return `allowed: false`.
**Validates: Requirements 5.3**

**Property 12: Expired API key rejection**
*For any* API key where `expiresAt` is in the past, all authorization checks using that key should return `allowed: false`.
**Validates: Requirements 5.4**

**Property 13: API key usage logging**
*For any* authorization check performed with an API key, an entry should be created in the audit log with the apiKeyId.
**Validates: Requirements 5.5, 6.4**

### Audit and Logging Properties

**Property 14: Role change logging**
*For any* role assignment or revocation, an entry should be created in roleChangeLog containing actorId, targetUserId, resourceType, resourceId, oldRole, newRole, and timestamp.
**Validates: Requirements 6.3**

**Property 15: Authorization failure reason logging**
*For any* authorization check that returns `allowed: false`, the log entry should contain a non-null `reason` field.
**Validates: Requirements 6.2**

### Permission Query Properties

**Property 16: Capabilities match permissions**
*For any* user and resource, the list of capabilities returned by `getCapabilities()` should exactly match the set of actions for which `can()` returns `allowed: true`.
**Validates: Requirements 7.1**

**Property 17: Permission cache invalidation on role change**
*For any* user whose role changes on a resource, subsequent permission checks should reflect the new role's permissions (cache should be invalidated).
**Validates: Requirements 7.5, 8.4**

### Performance Properties

**Property 18: Batch checking consistency**
*For any* set of permission checks, the results from `canBatch()` should match the results from calling `can()` individually for each check.
**Validates: Requirements 8.2**

**Property 19: Cache expiration**
*For any* cached permission or role, if accessed after the TTL (5 minutes), the system should fetch fresh data from the database.
**Validates: Requirements 8.3**

### Ownership Transfer Properties

**Property 20: Ownership transfer requires membership**
*For any* ownership transfer request, the target user must have an existing role (viewer, member, or admin) in the Sfera.
**Validates: Requirements 9.1**

**Property 21: Ownership transfer role changes**
*For any* completed ownership transfer, the previous owner should have admin role and the new owner should have owner role.
**Validates: Requirements 9.2, 9.3**

**Property 22: Ownership transfer logging**
*For any* ownership transfer, an entry should be created in roleChangeLog showing the role change from owner to admin for the previous owner, and to owner for the new owner.
**Validates: Requirements 9.4**

**Property 23: Single owner invariant**
*For any* Sfera at any point in time, exactly one user should have the owner role.
**Validates: Requirements 9.5**

## Error Handling

### Error Types

The authorization system will use structured errors that extend the existing `ChatSDKError`:

```typescript
export class AuthorizationError extends ChatSDKError {
  constructor(
    code: 'forbidden' | 'unauthorized' | 'invalid_role' | 'resource_not_found',
    message: string,
    public details?: {
      userId?: string;
      resourceId?: string;
      action?: string;
      requiredRole?: string;
    }
  ) {
    super(`authorization:${code}`, message);
  }
}
```

### Error Scenarios

1. **Unauthorized Access**: User attempts action without required role
   - Return `AuthorizationError` with code `forbidden`
   - Include required role in error details
   - Log the attempt in authorization log

2. **Invalid Resource**: Resource doesn't exist
   - Return `AuthorizationError` with code `resource_not_found`
   - Do not log in authorization log (resource doesn't exist)

3. **Invalid Role Assignment**: Attempt to assign non-existent role
   - Return `AuthorizationError` with code `invalid_role`
   - Log the failed attempt

4. **Guest User Restrictions**: Guest attempts privileged action
   - Return `AuthorizationError` with code `forbidden`
   - Include message about guest limitations

5. **API Key Issues**: Expired, revoked, or insufficient permissions
   - Return `AuthorizationError` with code `unauthorized` or `forbidden`
   - Log in MCP audit log

### Error Recovery

- All authorization errors should be caught at the API route level
- Return appropriate HTTP status codes (401, 403, 404)
- Include user-friendly error messages in API responses
- Never expose internal system details in error messages

## Testing Strategy

### Unit Testing

Unit tests will verify individual components in isolation:

1. **Policy Engine Tests**
   - Test role-action mappings
   - Verify role hierarchy logic
   - Test edge cases (unknown roles, unknown actions)

2. **Cache Manager Tests**
   - Test cache set/get operations
   - Verify TTL expiration
   - Test cache invalidation

3. **Audit Logger Tests**
   - Verify log entry creation
   - Test log querying with filters
   - Verify data retention

### Property-Based Testing

We will use **fast-check** (TypeScript property-based testing library) to implement the 23 correctness properties defined above. Each property will:

- Generate random test data (users, roles, resources, actions)
- Run at least 100 iterations per property
- Be tagged with the property number and requirements it validates

Example property test structure:

```typescript
import fc from 'fast-check';

describe('Authorization System Properties', () => {
  it('Property 1: Permission check logging completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          action: fc.constantFrom('sfera:view', 'sfera:edit', 'sfera:delete'),
          resourceId: fc.uuid(),
        }),
        async ({ userId, action, resourceId }) => {
          // Perform permission check
          const result = await authService.can(
            { userId, userType: 'regular' },
            action,
            { type: 'sfera', id: resourceId }
          );

          // Verify log entry exists
          const logs = await auditLogger.getAuditLog({
            userId,
            resourceId,
          });

          const matchingLog = logs.find(
            log => log.action === action && log.resourceId === resourceId
          );

          expect(matchingLog).toBeDefined();
          expect(matchingLog?.userId).toBe(userId);
          expect(matchingLog?.allowed).toBe(result.allowed);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

Integration tests will verify the authorization system works correctly with:

1. **Database Layer**
   - Test actual database queries for roles
   - Verify transaction handling for role changes
   - Test concurrent access scenarios

2. **API Routes**
   - Test authorization middleware integration
   - Verify correct HTTP status codes
   - Test session-based authorization

3. **MCP Integration**
   - Test API key authentication flow
   - Verify MCP audit logging
   - Test rate limiting integration

### Test Data Generators

For property-based testing, we'll create smart generators:

```typescript
// Generate valid role hierarchy
const roleGen = fc.constantFrom('owner', 'admin', 'member', 'viewer', 'guest');

// Generate valid actions
const actionGen = fc.constantFrom(
  'sfera:view',
  'sfera:message',
  'sfera:edit',
  'sfera:delete',
  'sfera:manage_members',
  'sfera:fork'
);

// Generate authorization context
const authContextGen = fc.record({
  userId: fc.uuid(),
  userType: fc.constantFrom('guest', 'regular'),
  apiKeyId: fc.option(fc.uuid()),
});

// Generate resource identifier
const resourceGen = fc.record({
  type: fc.constantFrom('sfera', 'message', 'artifact'),
  id: fc.uuid(),
  parentId: fc.option(fc.uuid()),
});
```

### Testing Priorities

1. **Critical Path**: Role-based permission checks (Properties 4, 5, 6)
2. **Security**: Guest restrictions, API key validation (Properties 7-13)
3. **Audit**: Logging completeness (Properties 1, 14, 15)
4. **Performance**: Caching behavior (Properties 17, 19)
5. **Data Integrity**: Ownership invariants (Property 23)

### Continuous Testing

- Run unit tests on every commit
- Run property-based tests in CI/CD pipeline
- Run integration tests before deployment
- Monitor authorization logs in production for anomalies

## Implementation Notes

### Migration Strategy

1. **Phase 1**: Implement core authorization service and policy engine
2. **Phase 2**: Add caching layer and audit logging
3. **Phase 3**: Integrate with existing Sfera API routes
4. **Phase 4**: Add MCP authorization support
5. **Phase 5**: Implement ownership transfer functionality

### Performance Considerations

- Use Redis for distributed caching in production
- Implement connection pooling for database queries
- Use database indexes for efficient role lookups
- Consider read replicas for audit log queries

### Security Considerations

- Never expose internal user IDs in error messages
- Rate limit authorization checks to prevent abuse
- Regularly audit authorization logs for suspicious patterns
- Implement IP-based blocking for repeated unauthorized attempts

### Monitoring and Observability

- Track authorization check latency (p50, p95, p99)
- Monitor cache hit rates
- Alert on unusual authorization failure patterns
- Dashboard for role distribution across Sferas
