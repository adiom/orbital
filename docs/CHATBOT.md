# Chatbot Implementation

## Overview
Traditional vertical chatbot interface using AI SDK's `useChat` hook with Server-Sent Events (SSE) streaming. Built for Avrora AI assistant with full tool support.

## Architecture

### Components
- **ChatbotInterface** (`components/chatbot/chatbot-interface.tsx`)
  - Main chatbot UI component
  - Uses `useChat` hook from AI SDK
  - Features: file uploads, voice recording, real-time streaming

- **ToolResultRenderer** (`components/chatbot/tool-result-renderer.tsx`)
  - Renders AI tool execution results
  - Supports: images, music, video, web search, charts, mini-apps

### API Routes
- **POST /api/chatbot** (`app/api/chatbot/route.ts`)
  - SSE streaming endpoint
  - Creates/manages Sfera sessions
  - Integrates with all Avrora tools
  - Real-time database sync

- **POST /api/files/upload** (`app/api/files/upload/route.ts`)
  - File upload to Vercel Blob
  - Supports images and audio files

### Page
- **/chatbot** (`app/(chat)/chatbot/page.tsx`)
  - Protected route (requires authentication)
  - Server component

## Key Features

1. **SSE Streaming**
   - Real-time text streaming via `toDataStreamResponse()`
   - No polling needed (unlike Orbit system)

2. **Tool Integration**
   - All Sfera tools available: image gen, web search, charts, etc.
   - Tool results displayed inline

3. **File Support**
   - Image upload
   - Audio recording and upload
   - Attachments in messages

4. **Session Management**
   - Creates new Sfera per chatbot session
   - Messages saved to `sferaMessage` table
   - Verifies user access to Sfera

5. **Database Sync**
   - Pre-creates user and AI messages
   - Throttled updates during streaming (200ms)
   - Final update with tool results

## Usage

Navigate to `/chatbot` to start a new chatbot session.

## Integration with Existing Systems

- **Sfera**: Creates private Sfera for each session
- **Avrora Agent**: Uses fixed ID `00000000-0000-0000-0000-000000000001`
- **Tools**: Same tool registry as Orbit (`getSferaTools()`)
- **Database**: Uses existing `sfera`, `sferaMember`, `sferaMessage` tables
- **Auth**: Uses NextAuth session

## Differences from Orbit

| Feature | Chatbot | Orbit |
|---------|---------|-------|
| UI Style | Vertical chat | Spatial visualization |
| Streaming | SSE (useChat) | Polling + WebSocket |
| Real-time | Built-in SSE | WebSocket server required |
| Route | `/chatbot` | `/orbit/[id]` |
| Components | Minimal UI | Complex canvas/layout |

## Future Improvements

- [ ] Add conversation history sidebar
- [ ] Support multiple Sfera switching
- [ ] Add export conversation feature
- [ ] Implement chat search
- [ ] Add typing indicators
- [ ] Support message editing/deletion
