# Implementation Plan

## Overview

Пошаговая реализация новой страницы группового чата для Sfera с использованием AI SDK Elements. Каждая задача построена инкрементально, с фокусом на минимальную работающую функциональность.

---

## Phase 1: Foundation & Setup

- [x] 1. Install AI SDK Elements dependencies
  - Update `ai` package (already installed: 5.0.26)
  - Verify AI SDK Elements components availability
  - Check shadcn/ui configuration
  - _Requirements: 1.1, 8.1_

- [x] 2. Create basic page structure
  - Create `/app/sfera/[id]/chat/page.tsx` (Server Component)
  - Implement auth check and session handling
  - Add Sfera membership verification
  - Return 404 if Sfera not found
  - Return 403 if user not a member
  - _Requirements: 1.1, 1.3, 1.4_

- [x] 3. Create SferaChatClient component
  - Create `/components/sfera/sfera-chat-client.tsx` (Client Component)
  - Add "use client" directive
  - Set up basic layout structure (header, conversation, input)
  - Pass sferaId and currentUserId as props
  - _Requirements: 1.1, 1.5_

---

## Phase 2: Message Display

- [x] 4. Integrate AI SDK Elements Conversation
  - Import Conversation, ConversationContent from AI Elements
  - Set up useChat hook with API endpoint
  - Display messages in ConversationContent
  - Add ConversationScrollButton
  - _Requirements: 5.1, 5.4, 5.5_

- [x] 5. Create SferaMessage component
  - Create `/components/sfera/sfera-message.tsx`
  - Render Message component from AI Elements
  - Display message author (email, timestamp)
  - Show AI badge for AI agents
  - Handle different message parts (text, reasoning, sources)
  - _Requirements: 5.2, 5.3_

- [x] 6. Implement message parts rendering
  - Render text parts with MessageResponse
  - Render reasoning parts with Reasoning component (collapsible)
  - Render sources with Sources component
  - Render tool results with custom ToolResultDisplay
  - Display attachments with preview
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 7.5_

---

## Phase 3: Message Input

- [x] 7. Create SferaPromptInput component
  - Create `/components/sfera/sfera-prompt-input.tsx`
  - Use PromptInput from AI Elements
  - Add PromptInputHeader with attachments display
  - Add PromptInputBody with textarea
  - Add PromptInputFooter with tools and submit
  - _Requirements: 2.1, 2.5_

- [ ] 8. Implement file attachments
  - Add PromptInputActionMenu with file picker
  - Handle image uploads (preview)
  - Handle audio uploads (indicator)
  - Allow removing attachments before send
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 9. Add mention functionality
  - Create MentionButton component
  - Show participant list on @ symbol
  - Insert @username into textarea
  - Highlight mentions in messages
  - _Requirements: 3.1, 3.2, 3.5_

---

## Phase 4: API Implementation

- [x] 10. Create streaming API endpoint
  - Create `/app/api/sfera/[id]/chat/route.ts`
  - Implement POST handler with auth check
  - Verify Sfera membership
  - Parse request body (messages, parentMessageId)
  - _Requirements: 8.1, 8.2_

- [ ] 11. Implement message saving
  - Save user message to sferaMessage table
  - Include content, attachments, parentMessageId
  - Return message ID to client
  - Update Sfera updatedAt timestamp
  - _Requirements: 2.2, 2.4, 8.2_

- [ ] 12. Implement mention detection
  - Create detectMentions utility function
  - Parse message content for @username and @agent patterns
  - Return list of mentioned users/agents
  - Save mentions to database
  - _Requirements: 3.3, 3.4_

- [ ] 13. Implement AI agent streaming
  - Detect AI agent mentions
  - Create empty message for each mentioned agent
  - Set isGenerating to true
  - Call streamText for agent
  - Return toUIMessageStreamResponse
  - _Requirements: 8.3, 8.4, 10.1, 10.2, 10.3_

- [ ] 14. Implement streamAgentResponse helper
  - Create helper function for async agent streaming
  - Stream tokens to message in real-time
  - Update message content in database
  - Handle reasoning, sources, tool results
  - Set isGenerating to false on completion
  - _Requirements: 10.4, 10.5, 8.5_

---

## Phase 5: Message Actions

- [ ] 15. Implement MessageActions
  - Add Copy action (all messages)
  - Add Retry action (AI messages only)
  - Add Edit action (own messages only)
  - Add Delete action (own messages only)
  - Add Fork action (all messages)
  - Add Copy Link action (all messages)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 15.1_

- [ ] 16. Implement message editing
  - Load message content into input on Edit click
  - Show "Editing" indicator
  - Send PATCH request to update message
  - Prevent editing of other users' messages
  - Clear input on cancel
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 17. Implement message deletion
  - Show confirmation dialog
  - Send DELETE request to API
  - Remove message from UI
  - Only allow deletion of own messages
  - Prevent deletion if message is forked
  - _Requirements: 6.5, 11.2_

- [ ] 18. Implement message forking
  - Create new Sfera on Fork action
  - Copy message to new Sfera
  - Copy all members from parent Sfera
  - Set isForked flag on original message
  - Redirect to new Sfera
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 19. Implement Copy Link action
  - Generate `/m/[messageId]` URL
  - Copy to clipboard
  - Show success toast
  - _Requirements: 15.2_

---

## Phase 6: Real-time Updates & Status

- [ ] 20. Implement loading states
  - Show Loader when message is submitting
  - Show streaming indicator for AI messages
  - Show error toast on failure
  - Hide loaders on completion
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 21. Implement optimistic updates
  - useChat handles this automatically
  - Verify optimistic message display
  - Handle server confirmation
  - Handle error rollback
  - _Requirements: 2.3_

- [ ] 22. Add real-time message updates
  - Integrate WebSocket or polling for multi-client sync
  - Update messages when other users post
  - Update AI messages during streaming
  - Handle concurrent edits gracefully
  - _Requirements: 10.4_

---

## Phase 7: Advanced Features

- [ ] 23. Implement reply functionality
  - Add Reply action to MessageActions
  - Show parent message indicator in input
  - Set parentMessageId on message send
  - Display parent message above replies
  - Allow canceling reply
  - _Requirements: 2.2, 11.1_

- [ ] 24. Implement tool execution display
  - Create ToolResultDisplay component
  - Render tool results in special format
  - Show tool execution indicator during execution
  - Save tool results to toolResults field
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 25. Implement AI message processing
  - Allow mentioning AI with message link
  - Load referenced message content
  - Pass to AI agent as context
  - Create new message with result
  - Link to original message via parentMessageId
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ] 26. Add file attachments to existing messages
  - Show file upload button during edit
  - Upload files to server
  - Add to attachments array
  - Update message in database
  - Display all attachments with preview
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

---

## Phase 8: Polish & Testing

- [ ] 27. Add SferaHeader component
  - Display Sfera title
  - Show member count
  - Add settings/info button
  - Style consistently with design
  - _Requirements: 1.5_

- [ ] 28. Implement error handling
  - Handle API errors gracefully
  - Show user-friendly error messages
  - Log errors to console
  - Implement retry logic for failed requests
  - _Requirements: 9.3_

- [ ] 29. Add loading skeleton states
  - Show skeleton while loading messages
  - Show skeleton for Sfera info
  - Smooth transition to actual content
  - _Requirements: 9.1_

- [ ] 30. Optimize performance
  - Implement message pagination (load 50 initial)
  - Add lazy loading for older messages
  - Cache Sfera info and member list
  - Optimize re-renders with React.memo
  - _Requirements: 5.1_

- [ ] 31. Add accessibility features
  - Ensure keyboard navigation works
  - Add ARIA labels to all interactive elements
  - Test with screen readers
  - Ensure color contrast meets WCAG standards
  - _Requirements: All_

- [ ] 32. Write integration tests
  - Test full chat flow (send → AI responds)
  - Test message editing and deletion
  - Test forking messages
  - Test attachment upload
  - _Requirements: All_

- [ ] 33. Final checkpoint - Ensure all tests pass
  - Run all integration tests
  - Verify all requirements are met
  - Test with multiple users
  - Test with different AI agents
  - Ask user if questions arise

---

## Notes

- Each task should be completed before moving to the next
- Test functionality after each task
- Commit changes after completing each phase
- New page exists at `/sfera/[id]/chat` parallel to old `/orbit/[id]`
- Old implementation remains untouched during development
