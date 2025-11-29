# Implementation Plan

- [ ] 1. Set up authorization service infrastructure
  - Create directory structure `lib/auth/` for authorization modules
  - Define TypeScript interfaces and types for authorization system
  - Set up error classes extending ChatSDKError
  - _Requirements: 1.1, 10.1_

- [ ] 2. Implement Policy Engine
  - Create `lib/auth/policy-engine.ts` with role-action mappings
  - Define role hierarchy (owner > admin > member > viewer > guest)
  - Implement `isAllowed()` method to check if role can perform action
  - Implement `getAllowedActions()` to get all actions for a role
  - Implement `getRequiredRole()` to get minimum role for an action
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 2.1 Write property test for role hierarchy
  - **Property 4: Role hierarchy for Sfera access**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.5, 3.2, 3.3, 3.4, 3.5**

- [ ] 2.2 Write property test for owner-only deletion
  - **Property 5: Owner-only deletion**
  - **Validates: Requirements 2.4**

- [ ] 2.3 Write property test for viewer read-only access
  - **Property 6: Viewer role is read-only**
  - **Validates: Requirements 3.5**

- [ ] 3. Create database schema for audit logging
  - Add `authorizationLog` table to `lib/db/schema.ts`
  - Add `roleChangeLog` table to `lib/db/schema.ts`
  - Create database migration for new tables
  - Add indexes for performance (userId, resourceId, createdAt)
  - Run migration with `pnpm db:migrate`
  - _Requirements: 1.2, 6.1, 6.2, 6.3, 8.5_

- [ ] 4. Implement Audit Logger
  - Create `lib/auth/audit-logger.ts` with AuditLogger interface
  - Implement `logAuthorizationCheck()` to record permission checks
  - Implement `logRoleChange()` to record role assignments/revocations
  - Implement `getAuditLog()` with filtering support
  - Use Drizzle ORM for database operations
  - _Requirements: 1.2, 6.1, 6.2, 6.3_

- [ ] 4.1 Write property test for permission check logging
  - **Property 1: Permission check logging completeness**
  - **Validates: Requirements 1.2, 6.1**

- [ ] 4.2 Write property test for role change logging
  - **Property 14: Role change logging**
  - **Validates: Requirements 6.3**

- [ ] 4.3 Write property test for failure reason logging
  - **Property 15: Authorization failure reason logging**
  - **Validates: Requirements 6.2**

- [ ] 5. Implement Cache Manager
  - Create `lib/auth/cache-manager.ts` with in-memory cache
  - Implement role caching with 5-minute TTL
  - Implement permission result caching
  - Implement cache invalidation methods
  - Add support for Redis in production (optional)
  - _Requirements: 8.1, 8.3, 8.4_

- [ ] 5.1 Write property test for cache expiration
  - **Property 19: Cache expiration**
  - **Validates: Requirements 8.3**

- [ ] 5.2 Write property test for cache invalidation on role change
  - **Property 17: Permission cache invalidation on role change**
  - **Validates: Requirements 7.5, 8.4**

- [ ] 6. Implement core Authorization Service
  - Create `lib/auth/authorization.ts` with main AuthorizationService class
  - Implement `can()` method for single permission checks
  - Implement `canBatch()` for batch permission checks
  - Implement `getCapabilities()` to list user's available actions
  - Integrate Policy Engine, Cache Manager, and Audit Logger
  - Add error handling with AuthorizationError
  - _Requirements: 1.1, 1.5, 7.1, 8.2_

- [ ] 6.1 Write property test for failed checks include reason
  - **Property 3: Failed permission checks include denial reason**
  - **Validates: Requirements 1.5, 7.2**

- [ ] 6.2 Write property test for batch checking consistency
  - **Property 18: Batch checking consistency**
  - **Validates: Requirements 8.2**

- [ ] 6.3 Write property test for capabilities match permissions
  - **Property 16: Capabilities match permissions**
  - **Validates: Requirements 7.1**

- [ ] 7. Implement Role Manager
  - Add `assignRole()` method to authorization service
  - Add `revokeRole()` method to authorization service
  - Add `getUserRole()` method to query user's role on resource
  - Implement role validation (only valid roles can be assigned)
  - Ensure role changes invalidate caches
  - Log all role changes to audit log
  - _Requirements: 2.5, 6.3, 7.5_

- [ ] 8. Implement guest user authorization
  - Add guest user checks to Policy Engine
  - Implement restrictions for guest users (no create, no message, no fork)
  - Allow guest users to view public Sferas
  - Add session expiration checks for guest users
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 8.1 Write property test for guest user restrictions
  - **Property 7: Guest user restrictions**
  - **Validates: Requirements 4.2, 4.3, 4.4**

- [ ] 8.2 Write property test for guest public Sfera access
  - **Property 8: Guest public Sfera access**
  - **Validates: Requirements 4.1**

- [ ] 8.3 Write property test for guest session expiration
  - **Property 9: Guest session expiration**
  - **Validates: Requirements 4.5**

- [ ] 9. Implement MCP API key authorization
  - Create `lib/auth/mcp-auth-handler.ts` for API key handling
  - Implement API key permission checking (resources, tools, admin)
  - Add API key revocation checks
  - Add API key expiration checks
  - Log all API key usage to audit trail
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 9.1 Write property test for API key permission enforcement
  - **Property 10: API key permission enforcement**
  - **Validates: Requirements 5.2**

- [ ] 9.2 Write property test for revoked API key rejection
  - **Property 11: Revoked API key rejection**
  - **Validates: Requirements 5.3**

- [ ] 9.3 Write property test for expired API key rejection
  - **Property 12: Expired API key rejection**
  - **Validates: Requirements 5.4**

- [ ] 9.4 Write property test for API key usage logging
  - **Property 13: API key usage logging**
  - **Validates: Requirements 5.5, 6.4**

- [ ] 10. Implement ownership transfer functionality
  - Add `transferOwnership()` method to authorization service
  - Verify target user is existing member before transfer
  - Change previous owner to admin role
  - Grant owner role to new user
  - Log ownership transfer in role change log
  - Ensure single owner invariant is maintained
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 10.1 Write property test for ownership transfer membership requirement
  - **Property 20: Ownership transfer requires membership**
  - **Validates: Requirements 9.1**

- [ ] 10.2 Write property test for ownership transfer role changes
  - **Property 21: Ownership transfer role changes**
  - **Validates: Requirements 9.2, 9.3**

- [ ] 10.3 Write property test for ownership transfer logging
  - **Property 22: Ownership transfer logging**
  - **Validates: Requirements 9.4**

- [ ] 10.4 Write property test for single owner invariant
  - **Property 23: Single owner invariant**
  - **Validates: Requirements 9.5**

- [ ] 11. Integrate authorization into Sfera API routes
  - Update `app/api/sfera/[id]/route.ts` to use authorization service
  - Replace inline permission checks with `authService.can()` calls
  - Update `app/api/sfera/[id]/members/route.ts` for member management
  - Update `app/api/sfera/[id]/messages/route.ts` for message permissions
  - Update `app/api/sfera/[id]/fork/route.ts` for fork permissions
  - Add proper error handling with AuthorizationError
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 12. Create authorization middleware for API routes
  - Create `lib/auth/middleware.ts` for Next.js route protection
  - Implement `requireAuth()` middleware to check authentication
  - Implement `requirePermission()` middleware for specific actions
  - Extract user context from NextAuth session
  - Handle both session-based and API key-based auth
  - _Requirements: 1.1, 5.2_

- [ ] 13. Add authorization helper for UI components
  - Create `lib/auth/client-helpers.ts` for client-side permission checks
  - Implement `usePermissions()` hook to get user capabilities
  - Create `PermissionGate` component to conditionally render UI
  - Add API endpoint `/api/auth/capabilities` to query permissions
  - _Requirements: 7.1, 7.3, 7.4_

- [ ] 14. Implement authorization rule updates
  - Add configuration file for authorization policies
  - Implement hot-reload of policy changes without restart
  - Add validation for policy configuration
  - Test that rule updates apply immediately
  - _Requirements: 1.3_

- [ ] 14.1 Write property test for immediate rule updates
  - **Property 2: Authorization rule updates are immediate**
  - **Validates: Requirements 1.3**

- [ ] 15. Add comprehensive error handling
  - Ensure all authorization errors use AuthorizationError class
  - Add user-friendly error messages for common scenarios
  - Map authorization errors to HTTP status codes (401, 403, 404)
  - Test error responses in API routes
  - _Requirements: 1.5, 7.2_

- [ ] 16. Set up property-based testing infrastructure
  - Install fast-check library: `pnpm add -D fast-check`
  - Create test data generators in `lib/auth/__tests__/generators.ts`
  - Set up test utilities for database mocking
  - Configure test environment for property tests
  - _Requirements: All properties_

- [ ] 17. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Add monitoring and observability
  - Add metrics for authorization check latency
  - Track cache hit rates
  - Create dashboard for authorization failures
  - Set up alerts for suspicious authorization patterns
  - _Requirements: 8.1_

- [ ] 19. Documentation and migration guide
  - Document authorization service API
  - Create migration guide for existing code
  - Add examples for common authorization patterns
  - Document policy configuration format
  - _Requirements: 1.1, 10.2_

- [ ] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
