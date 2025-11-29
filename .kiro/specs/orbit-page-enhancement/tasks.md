# Implementation Plan

- [x] 1. Setup database queries and utilities
  - Create new query functions in `lib/db/queries.ts` for sfera metadata
  - Implement `getSferaWithMetadata(sferaId, userId)` to fetch sfera with member count and parent info
  - Implement `checkSferaAccess(sferaId, userId)` to verify user permissions
  - Implement `getParentSfera(sferaId)` to get parent sfera for breadcrumbs
  - Create UUID validation utility function `isValidUUID(id)`
  - _Requirements: 6.1, 3.3_

- [ ]* 1.1 Write property test for getSferaWithMetadata
  - **Property 11: Member count display**
  - **Validates: Requirements 5.3**

- [ ]* 1.2 Write property test for checkSferaAccess
  - **Property 13: Settings button for owners/admins**
  - **Validates: Requirements 5.5**

- [ ]* 1.3 Write property test for ID validation
  - **Property 14: ID validation**
  - **Validates: Requirements 6.1**

- [x] 2. Create OrbitPageHeader component
  - Create `components/orbit/orbit-page-header.tsx` as client component
  - Implement breadcrumbs display with parent sfera link
  - Implement sfera title and description display
  - Implement metadata badges (member count, visibility status)
  - Implement back button to orbits list
  - Implement settings button (conditional on user role)
  - Add responsive design for mobile/tablet/desktop
  - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3_

- [ ]* 2.1 Write property test for header title display
  - **Property 3: Header displays sfera title**
  - **Validates: Requirements 3.1, 5.1**

- [ ]* 2.2 Write property test for breadcrumbs display
  - **Property 5: Breadcrumbs for forked sferas**
  - **Validates: Requirements 3.3**

- [ ]* 2.3 Write property test for back button presence
  - **Property 4: Back button presence**
  - **Validates: Requirements 3.2**

- [ ]* 2.4 Write property test for visibility display
  - **Property 12: Visibility status display**
  - **Validates: Requirements 5.4**

- [ ]* 2.5 Write property test for description display
  - **Property 10: Header displays sfera description**
  - **Validates: Requirements 5.2**

- [ ]* 2.6 Write property test for breadcrumb navigation
  - **Property 6: Breadcrumb navigation**
  - **Validates: Requirements 3.4**

- [ ]* 2.7 Write property test for mobile layout
  - **Property 15: Mobile layout adaptation**
  - **Validates: Requirements 7.1**

- [ ]* 2.8 Write property test for tablet layout
  - **Property 16: Tablet layout adaptation**
  - **Validates: Requirements 7.2**

- [ ]* 2.9 Write property test for desktop layout
  - **Property 17: Desktop layout adaptation**
  - **Validates: Requirements 7.3**

- [ ] 3. Create loading state component
  - Create `app/(orbit)/orbit/[id]/loading.tsx`
  - Implement skeleton for header (breadcrumbs, title, metadata)
  - Implement skeleton for chat area
  - Add informative loading message
  - Match existing gradient background styling
  - _Requirements: 1.1, 1.2_

- [ ]* 3.1 Write property test for loading indicator
  - **Property 1: Loading indicator visibility**
  - **Validates: Requirements 1.1**

- [ ] 4. Create error boundary component
  - Create `app/(orbit)/orbit/[id]/error.tsx` as client component
  - Implement error message display for different error types
  - Implement retry button with reset functionality
  - Handle ForbiddenError with specific message
  - Handle ValidationError with specific message
  - Handle NetworkError with retry option
  - Add error logging
  - _Requirements: 2.2, 2.3, 6.2_

- [ ] 5. Create not found page
  - Create `app/(orbit)/orbit/[id]/not-found.tsx`
  - Implement 404 message for non-existent sfera
  - Add back button to orbits list
  - Match existing error state styling
  - _Requirements: 2.1_

- [ ] 6. Implement metadata generation
  - Add `generateMetadata` function to `app/(orbit)/orbit/[id]/page.tsx`
  - Fetch sfera data for metadata
  - Generate page title from sfera title
  - Generate description from sfera description (with fallback)
  - Generate Open Graph metadata (og:title, og:description, og:type, og:url)
  - Handle missing description with default text
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 6.1 Write property test for page title
  - **Property 7: Page title matches sfera title**
  - **Validates: Requirements 4.1**

- [ ]* 6.2 Write property test for meta description
  - **Property 8: Meta description from sfera description**
  - **Validates: Requirements 4.2**

- [ ]* 6.3 Write property test for Open Graph metadata
  - **Property 9: Open Graph metadata generation**
  - **Validates: Requirements 4.3**

- [ ] 7. Update OrbitPage server component
  - Update `app/(orbit)/orbit/[id]/page.tsx` to async server component
  - Add ID validation with isValidUUID
  - Add authentication check with redirect to /login
  - Fetch sfera data with getSferaWithMetadata
  - Check sfera existence and call notFound() if missing
  - Check user access with checkSferaAccess
  - Throw ForbiddenError if no access
  - Pass sfera metadata to OrbitPageHeader
  - Render OrbitPageHeader above OrbitChat
  - Keep OrbitChat unchanged
  - _Requirements: 2.4, 6.1, 6.3_

- [ ]* 7.1 Write property test for unauthenticated redirect
  - **Property 2: Unauthenticated redirect**
  - **Validates: Requirements 2.4**

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 9. Write integration tests
  - Test full page load flow with valid sfera
  - Test error handling for invalid sfera ID
  - Test redirect for unauthenticated user
  - Test navigation through breadcrumbs
  - Test back button navigation
  - Test settings button opens modal (for owners/admins)
  - Test responsive behavior on viewport resize

- [ ]* 10. Add unit tests for edge cases
  - Test sfera without description uses default
  - Test invalid UUID format shows validation error
  - Test missing parameters trigger 404
  - Test network error shows retry button
