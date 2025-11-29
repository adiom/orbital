# Design Document

## Overview

Новая страница группового чата для Sfera, построенная с использованием AI SDK Elements и современной streaming архитектуры. Страница будет существовать параллельно со старой реализацией (`/orbit/[id]`) как `/sfera/[id]/chat` до полного тестирования и миграции.

**Ключевые принципы:**
- Сообщение = редактируемый документ с уникальным UUID
- AI-агенты = обычные участники, которые автоматически отвечают на упоминания
- Streaming контента в существующие сообщения
- Использование AI SDK Elements для богатого UI

## Architecture

### High-Level Flow

```
┌─────────────┐
│   Browser   │
│  (Client)   │
└──────┬──────┘
       │
       │ useChat hook
       │ (AI SDK)
       ▼
┌─────────────────────────────┐
│  /api/sfera/[id]/chat       │
│  (Streaming API)            │
└──────┬──────────────────────┘
       │
       ├──► Save user message to DB
       │
       ├──► Detect mentions (@avrora, @user)
       │
       ├──► Send notifications
       │
       └──► For AI agents:
            ├──► Create empty message
            ├──► streamText()
            └──► Update message in real-time
```

### Component Hierarchy

```
/sfera/[id]/chat (Page)
├── SferaChatLayout
│   ├── Header (title, members count)
│   ├── Conversation (AI Elements)
│   │   ├── ConversationContent
│   │   │   └── Message[] (AI Elements)
│   │   │       ├── MessageContent
│   │   │       │   ├── MessageResponse (text)
│   │   │       │   ├── Reasoning (collapsible)
│   │   │       │   ├── Sources (links)
│   │   │       │   └── ToolResults (custom)
│   │   │       └── MessageActions
│   │   │           ├── Copy
│   │   │           ├── Retry (AI only)
│   │   │           ├── Edit (own only)
│   │   │           ├── Delete (own only)
│   │   │           ├── Fork
│   │   │           └── Copy Link
│   │   └── ConversationScrollButton
│   └── PromptInput (AI Elements)
│       ├── PromptInputHeader
│       │   └── PromptInputAttachments
│       ├── PromptInputBody
│       │   └── PromptInputTextarea
│       └── PromptInputFooter
│           ├── PromptInputTools
│           │   ├── ActionMenu (attachments)
│           │   └── MentionButton (@avrora)
│           └── PromptInputSubmit
```

## Components and Interfaces

### 1. Page Component: `/sfera/[id]/chat/page.tsx`

```typescript
// Server Component
export default async function SferaChatPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  
  // Check membership
  const membership = await checkSferaMembership(id, session?.user?.id);
  if (!membership) {
    return <AccessDenied />;
  }
  
  // Get Sfera info
  const sfera = await getSfera(id);
  if (!sfera) {
    notFound();
  }
  
  return (
    <SferaChatClient 
      sferaId={id}
      currentUserId={session?.user?.id}
      initialSfera={sfera}
    />
  );
}
```

### 2. Client Component: `SferaChatClient`

```typescript
'use client';

export function SferaChatClient({ sferaId, currentUserId, initialSfera }: Props) {
  const { messages, sendMessage, status, regenerate } = useChat({
    api: `/api/sfera/${sferaId}/chat`,
    initialMessages: [], // Load from server
  });
  
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  
  const handleSubmit = (message: PromptInputMessage) => {
    sendMessage(
      { 
        text: message.text,
        files: message.files 
      },
      {
        body: {
          parentMessageId: replyingTo?.id,
          sferaId,
        },
      },
    );
    setReplyingTo(null);
  };
  
  return (
    <div className="flex h-screen flex-col">
      <SferaHeader sfera={initialSfera} />
      
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.map((message) => (
            <SferaMessage
              key={message.id}
              message={message}
              currentUserId={currentUserId}
              onReply={() => setReplyingTo(message)}
              onEdit={() => setEditingMessage(message)}
              onFork={handleFork}
              onDelete={handleDelete}
            />
          ))}
          {status === 'submitted' && <Loader />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      
      <SferaPromptInput
        onSubmit={handleSubmit}
        replyingTo={replyingTo}
        editingMessage={editingMessage}
        onCancelReply={() => setReplyingTo(null)}
        onCancelEdit={() => setEditingMessage(null)}
        status={status}
      />
    </div>
  );
}
```

### 3. Message Component: `SferaMessage`

```typescript
'use client';

export function SferaMessage({ message, currentUserId, ...handlers }: Props) {
  const isOwn = message.userId === currentUserId;
  const isAI = AI_AGENT_IDS.includes(message.userId);
  
  return (
    <div>
      {message.parts.map((part, i) => {
        switch (part.type) {
          case 'text':
            return (
              <Message key={i} from={message.role}>
                <MessageContent>
                  <MessageAuthor 
                    email={message.userEmail}
                    isAI={isAI}
                    timestamp={message.createdAt}
                  />
                  <MessageResponse>
                    {part.text}
                  </MessageResponse>
                </MessageContent>
                <MessageActions>
                  <MessageAction onClick={() => copyToClipboard(part.text)}>
                    <CopyIcon />
                  </MessageAction>
                  {isAI && (
                    <MessageAction onClick={handlers.onRetry}>
                      <RefreshIcon />
                    </MessageAction>
                  )}
                  {isOwn && (
                    <>
                      <MessageAction onClick={handlers.onEdit}>
                        <EditIcon />
                      </MessageAction>
                      <MessageAction onClick={handlers.onDelete}>
                        <DeleteIcon />
                      </MessageAction>
                    </>
                  )}
                  <MessageAction onClick={handlers.onFork}>
                    <ForkIcon />
                  </MessageAction>
                  <MessageAction onClick={() => copyLink(message.id)}>
                    <LinkIcon />
                  </MessageAction>
                </MessageActions>
              </Message>
            );
            
          case 'reasoning':
            return (
              <Reasoning key={i} isStreaming={message.isGenerating}>
                <ReasoningTrigger />
                <ReasoningContent>{part.text}</ReasoningContent>
              </Reasoning>
            );
            
          case 'source-url':
            return (
              <Sources key={i}>
                <SourcesTrigger count={1} />
                <SourcesContent>
                  <Source href={part.url} title={part.url} />
                </SourcesContent>
              </Sources>
            );
            
          case 'tool-result':
            return (
              <ToolResultDisplay key={i} result={part} />
            );
            
          default:
            return null;
        }
      })}
      
      {message.attachments?.map((attachment, i) => (
        <AttachmentDisplay key={i} attachment={attachment} />
      ))}
    </div>
  );
}
```

### 4. Prompt Input: `SferaPromptInput`

```typescript
'use client';

export function SferaPromptInput({ 
  onSubmit, 
  replyingTo, 
  editingMessage,
  status 
}: Props) {
  const [input, setInput] = useState('');
  
  return (
    <PromptInput onSubmit={onSubmit} globalDrop multiple>
      {replyingTo && (
        <ReplyIndicator message={replyingTo} onCancel={onCancelReply} />
      )}
      
      {editingMessage && (
        <EditIndicator message={editingMessage} onCancel={onCancelEdit} />
      )}
      
      <PromptInputHeader>
        <PromptInputAttachments>
          {(attachment) => <PromptInputAttachment data={attachment} />}
        </PromptInputAttachments>
      </PromptInputHeader>
      
      <PromptInputBody>
        <PromptInputTextarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
      </PromptInputBody>
      
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          
          <MentionButton onClick={() => insertMention('@avrora')} />
        </PromptInputTools>
        
        <PromptInputSubmit disabled={!input} status={status} />
      </PromptInputFooter>
    </PromptInput>
  );
}
```

## Data Models

### Message Type (Extended UIMessage)

```typescript
type SferaMessage = {
  id: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
  userId: string;
  userEmail: string;
  parentMessageId: string | null;
  attachments?: Attachment[];
  toolResults?: ToolResult[];
  isForked: boolean;
  forkedSferaId: string | null;
  isGenerating?: boolean;
  createdAt: Date;
};

type MessagePart = 
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'source-url'; url: string }
  | { type: 'tool-result'; toolName: string; result: unknown };

type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
```

### Database Schema (Existing)

```typescript
// sferaMessage table
{
  id: uuid (PK),
  sferaId: uuid (FK),
  userId: uuid (FK),
  content: text,
  parentMessageId: uuid (nullable, FK),
  attachments: jsonb,
  toolResults: jsonb,
  isForked: boolean,
  forkCount: integer,
  isGenerating: boolean,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

## API Design

### POST /api/sfera/[id]/chat

**Request:**
```typescript
{
  messages: UIMessage[],
  parentMessageId?: string,
  sferaId: string,
}
```

**Response:** Streaming via `toUIMessageStreamResponse`

**Implementation:**
```typescript
export async function POST(req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { id: sferaId } = await context.params;
  const { messages, parentMessageId } = await req.json();
  
  // Check membership
  const membership = await checkMembership(sferaId, session.user.id);
  if (!membership) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Get last user message
  const lastMessage = messages[messages.length - 1];
  
  // Save user message to DB
  const [userMessage] = await db.insert(sferaMessage).values({
    sferaId,
    userId: session.user.id,
    content: lastMessage.content,
    parentMessageId,
    attachments: lastMessage.experimental_attachments || [],
  }).returning();
  
  // Detect mentions
  const mentions = detectMentions(lastMessage.content);
  
  // Send notifications
  await sendNotifications(mentions, userMessage.id);
  
  // Check if AI agent mentioned
  const aiAgents = mentions.filter(m => AI_AGENT_IDS.includes(m.userId));
  
  if (aiAgents.length === 0) {
    // No AI agents, return empty stream
    return new Response('', { status: 200 });
  }
  
  // For each AI agent, create empty message and stream response
  for (const agent of aiAgents) {
    // Create empty message
    const [agentMessage] = await db.insert(sferaMessage).values({
      sferaId,
      userId: agent.userId,
      content: '',
      parentMessageId: userMessage.id,
      isGenerating: true,
    }).returning();
    
    // Start streaming (async)
    streamAgentResponse({
      sferaId,
      messageId: agentMessage.id,
      triggerMessageId: userMessage.id,
      agent,
      messages,
    });
  }
  
  // Return streaming response for first agent
  const firstAgent = aiAgents[0];
  const result = streamText({
    model: firstAgent.model,
    messages: convertToModelMessages(messages),
    system: firstAgent.systemPrompt,
  });
  
  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });
}
```

### Helper: `streamAgentResponse`

```typescript
async function streamAgentResponse({
  sferaId,
  messageId,
  triggerMessageId,
  agent,
  messages,
}: StreamAgentParams) {
  try {
    const result = await streamText({
      model: agent.model,
      messages: convertToModelMessages(messages),
      system: agent.systemPrompt,
      onFinish: async ({ text, reasoning, sources, toolResults }) => {
        // Update message in DB
        await db.update(sferaMessage)
          .set({
            content: text,
            toolResults: toolResults || [],
            isGenerating: false,
            updatedAt: new Date(),
          })
          .where(eq(sferaMessage.id, messageId));
      },
    });
    
    // Stream to WebSocket or SSE
    for await (const chunk of result.textStream) {
      await broadcastToSfera(sferaId, {
        type: 'message_update',
        messageId,
        chunk,
      });
    }
  } catch (error) {
    console.error('Agent streaming error:', error);
    await db.update(sferaMessage)
      .set({
        content: 'Error generating response',
        isGenerating: false,
      })
      .where(eq(sferaMessage.id, messageId));
  }
}
```

## Error Handling

### Client-Side

```typescript
// useChat automatically handles errors
const { error } = useChat({
  api: `/api/sfera/${sferaId}/chat`,
  onError: (error) => {
    toast.error(error.message);
  },
});
```

### Server-Side

```typescript
try {
  // ... streaming logic
} catch (error) {
  console.error('Streaming error:', error);
  return Response.json(
    { error: 'Failed to generate response' },
    { status: 500 }
  );
}
```

## Testing Strategy

### Unit Tests

- Message component rendering with different part types
- PromptInput validation and submission
- Mention detection logic
- Permission checks (edit own messages only)

### Integration Tests

- Full chat flow: send message → AI responds
- Forking messages to new Sfera
- Editing and deleting messages
- Attachment upload and display

### E2E Tests (Playwright)

- User sends message with @avrora mention
- AI agent creates empty message
- AI agent streams response
- User edits their own message
- User forks message to new Sfera

## Performance Considerations

- **Streaming**: Use `toUIMessageStreamResponse` for real-time updates
- **Optimistic Updates**: useChat handles this automatically
- **Message Pagination**: Load initial 50 messages, lazy load older
- **WebSocket**: Use for real-time updates across multiple clients
- **Caching**: Cache Sfera info and member list

## Security Practices

- **Authentication**: Check session on every API call
- **Authorization**: Verify Sfera membership before operations
- **Edit Permissions**: Only message author can edit
- **Delete Permissions**: Only message author can delete (unless forked)
- **Input Validation**: Sanitize all user input with Zod
- **Rate Limiting**: Apply to AI agent calls

## Migration Strategy

1. **Phase 1**: Build new page at `/sfera/[id]/chat`
2. **Phase 2**: Test with small group of users
3. **Phase 3**: Add toggle to switch between old/new UI
4. **Phase 4**: Migrate all users to new UI
5. **Phase 5**: Deprecate old `/orbit/[id]` page

## Future Enhancements

- Real-time collaboration (multiple users typing)
- Message reactions (emoji)
- Thread view (collapse/expand threads)
- Search within Sfera
- Export chat history
- Voice messages with transcription
- Video attachments
