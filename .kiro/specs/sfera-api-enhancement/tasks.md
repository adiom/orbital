# Implementation Plan

- [x] 1. Database schema updates and migrations
  - [x] 1.1 Add agent_registry table with webhook configuration
    - Create table with id, name, userId, email, webhookUrl, webhookSecret, authToken, metadata, healthStatus, lastHealthCheck, failedWebhookCount
    - Add foreign key to user table
    - _Requirements: 12.1_
  
  - [x] 1.2 Add messageType and idempotencyKey to sfera_message table
    - Add messageType enum column (user, agent, system)
    - Add idempotencyKey varchar column
    - Add default value 'user' for messageType
    - _Requirements: 16.1, 15.1_
  
  - [x] 1.3 Create idempotency_log table
    - Create table with key (PK), messageId (FK), createdAt, expiresAt
    - Add index on expiresAt for cleanup queries
    - _Requirements: 15.2_
  
  - [x] 1.4 Add performance indexes
    - Create composite index on (sferaId, createdAt) for pagination
    - Create index on messageType for filtering
    - Create index on userId for author filtering
    - Create GIN index for full-text search on content
    - Create index on idempotencyKey
    - _Requirements: 8.4, 6.2_
  
  - [x] 1.5 Generate and run migrations
    - Run drizzle-kit generate
    - Test migrations on development database
    - _Requirements: All schema changes_

- [ ] 2. Validation layer with Zod schemas
  - [ ] 2.1 Create validation schemas
    - Create createMessageSchema with content, parentMessageId, attachments, idempotencyKey
    - Create paginationSchema with cursor, limit (1-100)
    - Create messageFilterSchema with userId, messageType, hasAttachments, isForked, dateFrom, dateTo
    - Create agentRegistrationSchema
    - _Requirements: 2.1_
  
  - [ ]* 2.2 Write property test for validation
    - **Property 5: Validation and error response**
    - **Validates: Requirements 2.1, 2.2**
  
  - [ ] 2.3 Create validation middleware
    - Implement validateRequest middleware that uses Zod schemas
    - Return 400 with detailed error messages on validation failure
    - Support strict mode configuration
    - _Requirements: 2.2, 2.3_

- [ ] 3. Rate limiting system
  - [ ] 3.1 Implement Redis-based rate limiter
    - Create checkRateLimit function using Redis sorted sets
    - Implement sliding window algorithm
    - Support different limits for users, agents, admins
    - Return remaining count and resetAt timestamp
    - _Requirements: 3.1, 3.2_
  
  - [ ]* 3.2 Write property test for rate limiting
    - **Property 12: Rate limit enforcement**
    - **Validates: Requirements 3.2**
  
  - [ ] 3.3 Create rate limit middleware
    - Apply rate limits to API routes
    - Return 429 with retry-after header when exceeded
    - Log rate limit violations
    - _Requirements: 3.2, 10.4_

- [ ] 4. Pagination system
  - [ ] 4.1 Implement cursor-based pagination
    - Create encodeCursor and decodeCursor functions
    - Implement getMessages with cursor support
    - Support limit parameter (1-100, default 50)
    - Return nextCursor and hasMore in response
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [ ]* 4.2 Write property tests for pagination
    - **Property 1: Pagination default limit**
    - **Validates: Requirements 1.1**
  
  - [ ]* 4.3 Write property test for cursor consistency
    - **Property 2: Cursor-based pagination consistency**
    - **Validates: Requirements 1.2**
  
  - [ ]* 4.4 Write property test for limit bounds
    - **Property 3: Limit parameter bounds**
    - **Validates: Requirements 1.3**
  
  - [ ]* 4.5 Write property test for end indicator
    - **Property 4: End of pagination indicator**
    - **Validates: Requirements 1.4**

- [ ] 5. Message filtering and search
  - [ ] 5.1 Implement message filters
    - Add support for userId filter
    - Add support for messageType filter
    - Add support for hasAttachments filter
    - Add support for isForked filter
    - Add support for date range filters
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ]* 5.2 Write property test for author filter
    - **Property 11: Author filter correctness**
    - **Validates: Requirements 7.1**
  
  - [ ] 5.3 Implement full-text search
    - Create searchMessages function using PostgreSQL to_tsvector
    - Support Russian language search
    - Return results with pagination
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 6. Idempotency system
  - [ ] 6.1 Create IdempotencyService
    - Implement checkAndStore method
    - Check for existing keys in idempotency_log
    - Handle expired keys (>24 hours)
    - Return existing message for duplicate requests
    - _Requirements: 15.2, 15.3, 15.4_
  
  - [ ]* 6.2 Write property tests for idempotency
    - **Property 7: Idempotency key uniqueness**
    - **Validates: Requirements 15.2, 15.3**
  
  - [ ] 6.3 Integrate idempotency into message creation
    - Accept X-Idempotency-Key header
    - Use IdempotencyService before creating message
    - Return 200 with existing message for duplicates
    - _Requirements: 15.1, 15.3_

- [ ] 7. Agent Registry Service
  - [ ] 7.1 Create AgentRegistryService class
    - Implement registerAgent method
    - Implement updateAgent method
    - Implement deleteAgent method
    - Implement getAgent and listActiveAgents methods
    - _Requirements: 12.1, 12.3, 12.4_
  
  - [ ] 7.2 Implement webhook validation
    - Create validateWebhook method that sends test ping
    - Verify webhook responds with 200
    - Update agent configuration on success
    - _Requirements: 12.2_
  
  - [ ] 7.3 Implement health status management
    - Create updateHealthStatus method
    - Create incrementFailedWebhooks method
    - Create resetFailedWebhooks method
    - _Requirements: 17.1, 17.2, 17.3_
  
  - [ ]* 7.4 Write property test for health transitions
    - **Property 9: Health status transition**
    - **Validates: Requirements 17.1**

- [ ] 8. Webhook signature system
  - [ ] 8.1 Implement HMAC-SHA256 signing
    - Create signWebhookPayload function
    - Create verifyWebhookSignature function
    - Use crypto.timingSafeEqual for comparison
    - _Requirements: 9.6, 9.7_
  
  - [ ]* 8.2 Write property test for signature round-trip
    - **Property 6: HMAC signature round-trip**
    - **Validates: Requirements 9.6**

- [ ] 9. Notification Service
  - [ ] 9.1 Create NotificationService class
    - Implement sendWebhook method
    - Implement sendWebhookWithRetry with exponential backoff
    - Implement determinePriority method
    - _Requirements: 9.1, 9.2, 9.3, 18.1, 18.2, 18.3_
  
  - [ ] 9.2 Implement webhook payload builder
    - Build WebhookPayload with event, idempotencyKey, priority
    - Include sfera context
    - Include trigger message
    - Include recent messages (up to 30)
    - Include thread messages if parentMessageId exists
    - Include artifacts if present
    - Limit payload size to 1MB
    - _Requirements: 9.2, 14.1, 14.2, 14.3, 14.4_
  
  - [ ]* 9.3 Write property test for webhook context
    - **Property 14: Webhook context completeness**
    - **Validates: Requirements 14.1**
  
  - [ ] 9.4 Implement webhook retry logic
    - Retry up to 3 times with exponential backoff (1s, 2s, 4s)
    - Update agent health status on failures
    - Create system message in Sfera on final failure
    - _Requirements: 9.3, 9.4, 17.1_

- [ ] 10. Webhook priority queue
  - [ ] 10.1 Create WebhookQueue class
    - Implement three priority queues (high, normal, low)
    - Implement enqueue method
    - Implement processQueue method that processes high priority first
    - _Requirements: 18.4_
  
  - [ ]* 10.2 Write property test for priority ordering
    - **Property 15: Priority ordering**
    - **Validates: Requirements 18.4**

- [ ] 11. Message Service enhancements
  - [ ] 11.1 Update MessageService.createMessage
    - Add messageType parameter
    - Auto-detect messageType based on userId (agent vs user)
    - Integrate idempotency checking
    - Detect mentioned agents
    - Queue webhooks for mentioned agents
    - _Requirements: 16.1, 16.2, 9.1_
  
  - [ ]* 11.2 Write property test for agent message type
    - **Property 8: Agent message type invariant**
    - **Validates: Requirements 16.2**
  
  - [ ] 11.3 Update MessageService.getMessages
    - Add pagination support
    - Add filtering support
    - Optimize with JOINs to avoid N+1 queries
    - Use indexes for performance
    - _Requirements: 1.1, 1.2, 7.1, 7.2, 7.3, 7.4, 8.1_
  
  - [ ] 11.4 Create MessageService.searchMessages
    - Implement full-text search
    - Return paginated results
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 12. Update API routes for messages
  - [ ] 12.1 Update GET /api/sfera/[id]/messages
    - Add validation middleware
    - Add rate limiting middleware
    - Support pagination query parameters
    - Support filter query parameters
    - Support search query parameter
    - Return paginated response with nextCursor and hasMore
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2, 7.3, 7.4, 6.1_
  
  - [ ] 12.2 Update POST /api/sfera/[id]/messages
    - Add validation middleware
    - Add rate limiting middleware
    - Support X-Idempotency-Key header
    - Use IdempotencyService
    - Detect agent mentions
    - Queue webhooks asynchronously
    - Return message with webhook status
    - _Requirements: 2.1, 3.1, 15.1, 9.1_
  
  - [ ] 12.3 Update PATCH /api/sfera/[id]/messages/[messageId]
    - Add validation middleware
    - Add rate limiting middleware for agents
    - Support content updates
    - Support isGenerating updates
    - Support toolResults updates
    - Check message size limits (return 413 if exceeded)
    - _Requirements: 11.3, 11.4, 11.5, 11.7_

- [ ] 13. Agent API endpoints
  - [ ] 13.1 Create POST /api/agents
    - Add admin authentication
    - Validate request with Zod schema
    - Register agent in AgentRegistry
    - Generate auth token
    - Return agent config and token
    - _Requirements: 12.1_
  
  - [ ] 13.2 Create GET /api/agents
    - Add authentication
    - Support includeUnhealthy query parameter
    - Return list of agents with health status
    - _Requirements: 12.4, 17.4_
  
  - [ ] 13.3 Create PATCH /api/agents/[id]
    - Add admin authentication
    - Validate webhook URL if updated
    - Update agent configuration
    - _Requirements: 12.2_
  
  - [ ] 13.4 Create DELETE /api/agents/[id]
    - Add admin authentication
    - Delete agent from registry
    - Revoke auth tokens
    - _Requirements: 12.3_

- [ ] 14. WebSocket enhancements
  - [ ] 14.1 Update WebSocket server for message events
    - Send event on message creation
    - Send incremental updates for agent messages
    - Include message data in event payload
    - _Requirements: 13.1, 13.2_
  
  - [ ]* 14.2 Write property test for WebSocket delivery
    - **Property 13: WebSocket event delivery**
    - **Validates: Requirements 13.1**
  
  - [ ] 14.3 Implement subscription management
    - Subscribe user to all their Sfera on connect
    - Clean up subscriptions on disconnect
    - _Requirements: 13.3, 13.4_

- [ ] 15. Transaction management
  - [ ] 15.1 Update fork operation with transaction
    - Wrap all fork steps in db.transaction()
    - Create new Sfera
    - Copy message
    - Copy members
    - Mark parent message as forked
    - Rollback on any failure
    - _Requirements: 5.1, 5.2_
  
  - [ ]* 15.2 Write property test for fork atomicity
    - **Property 10: Fork operation atomicity**
    - **Validates: Requirements 5.1**
  
  - [ ] 15.3 Update Sfera creation with transaction
    - Wrap Sfera and member creation in transaction
    - Rollback on failure
    - _Requirements: 5.3_

- [ ] 16. Logging and monitoring
  - [ ] 16.1 Implement structured logging
    - Create logger utility with structured format
    - Log all API requests with method, path, userId, timestamp
    - Log errors with stack trace and context
    - Log critical operations for audit
    - Log rate limit violations
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [ ] 16.2 Create health check endpoint
    - Implement GET /api/health
    - Check database connection
    - Check Redis connection
    - Check WebSocket server
    - Return agent health statistics
    - _Requirements: 17.4_
  
  - [ ]* 16.3 Add monitoring metrics
    - Track API latency
    - Track webhook delivery success rate
    - Track agent health changes
    - Track rate limit hits

- [ ] 17. Security hardening
  - [ ] 17.1 Implement agent authentication
    - Verify Bearer token for agent requests
    - Check agent is member of Sfera
    - _Requirements: 11.1, 11.2_
  
  - [ ] 17.2 Add input sanitization
    - Sanitize all user inputs
    - Prevent SQL injection via parameterized queries
    - Validate URLs in webhook configuration
    - _Requirements: 2.1_
  
  - [ ] 17.3 Implement token rotation
    - Add endpoint for rotating agent auth tokens
    - Invalidate old tokens
    - _Requirements: 12.1_

- [ ] 18. Documentation and cleanup
  - [ ] 18.1 Update API documentation
    - Document new endpoints
    - Document query parameters
    - Document webhook payload format
    - Document error responses
  
  - [ ] 18.2 Remove old agent streaming code
    - Delete lib/ai/agents/base-streamer.ts
    - Remove synchronous agent invocation from message creation
    - Update agent detector to only detect mentions
  
  - [ ] 18.3 Update Sfera API steering file
    - Document new webhook architecture
    - Document pagination
    - Document idempotency
    - Document agent registration

- [ ] 19. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

