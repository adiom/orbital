/**
 * Script to initialize Sfera documentation structure
 * Run with: npx tsx scripts/init-sfera-docs.ts
 */

import { eq, inArray, or } from "drizzle-orm";
import { db } from "../lib/db";
import {
  sfera,
  sferaForkedSfera,
  sferaMember,
  sferaMessage,
  user,
} from "../lib/db/schema";

// You'll need to replace this with actual user IDs from your database
const OWNER_EMAIL = "your-email@example.com"; // Replace with your email
const TEAM_EMAILS = ["team@example.com"]; // Replace with team member emails

interface SferaNode {
  title: string;
  description: string;
  messages: string[];
  children?: {
    forkFromMessage: number; // index of message to fork from
    node: SferaNode;
  }[];
}

// Documentation structure
const docsStructure: SferaNode = {
  title: "Sfera Project - Overview",
  description:
    "Main documentation hub for the Sfera project - a fork-based collaborative discussion platform",
  messages: [
    `# Welcome to Sfera Project Documentation

Sfera is a revolutionary discussion platform where every message can branch into a new conversation space (fork).

Key Features:
- Fork any message to create a new discussion branch
- Collaborative spaces with role-based access control
- Beautiful graph visualization of discussion networks
- Real-time updates and notifications`,

    `## What Makes Sfera Unique?

Unlike traditional chat apps where conversations are linear, Sfera allows:
- Any message to become the root of a new discussion
- Preservation of conversation context through parent-child relationships
- Visual representation of how ideas branch and evolve
- Collaborative ownership of discussion spaces`,

    `## Current Status

✅ Completed Features:
- Core Sfera CRUD operations
- Message forking system
- Member management
- Graph visualization
- Settings UI
- Modern iOS-inspired design

🚧 In Progress:
- Real-time collaboration
- Notifications
- Search functionality`,
  ],
  children: [
    {
      forkFromMessage: 2, // Fork from "Current Status" message
      node: {
        title: "Completed Features - Deep Dive",
        description: "Detailed documentation of all implemented features",
        messages: [
          `# Completed Features

Let's explore what's already working in Sfera.`,

          `## 1. Sfera Management

- Create new Sferas with title, description, visibility settings
- Invite members by email
- Edit Sfera details (owner/admin only)
- Delete Sferas (owner only)
- View all your Sferas in a beautiful graph layout`,

          `## 2. Forking System

The core innovation of Sfera:
- Click "Fork" on any message to create a new Sfera
- Original message becomes the first message in the new Sfera
- All members are automatically copied to the forked Sfera
- Visual indicators show which messages have been forked
- "Enter Fork" button to navigate to forked discussions`,

          `## 3. Member Management

- Add members by email
- Remove members (can't remove owner)
- Role-based permissions:
  - Owner: Full control
  - Admin: Can manage members and settings
  - Member: Can read and write messages`,

          `## 4. Graph Visualization

Beautiful visualization on /sferas page:
- Canvas-based rendering with curved connection lines
- Tree layout for hierarchical structures
- Circular layout for unconnected Sferas
- Interactive hover effects
- Click to navigate to any Sfera`,

          `## 5. Modern UI Design

iOS-inspired interface:
- Rounded white message bubbles
- Haptic feedback throughout
- Auto-growing textarea
- Smooth animations and transitions
- Gray-50 background palette`,
        ],
        children: [
          {
            forkFromMessage: 2,
            node: {
              title: "Forking System - Technical Details",
              description:
                "Technical implementation details of the forking system",
              messages: [
                `# Forking System - Technical Implementation

The forking system is built on several database tables working together.`,

                `## Database Schema

**sfera table:**
- id, title, description, ownerId
- visibility (private/public/dao)
- timestamps

**sferaMessage table:**
- id, sferaId, content, userId
- parentMessageId (for threading)
- isForked (boolean flag)
- forkCount

**sferaForkedSfera table:**
- parentSferaId
- forkedSferaId
- parentMessageId (the message that was forked)
- createdById, createdAt

**sferaMember table:**
- sferaId, userId
- role (owner/admin/member/viewer)
- joinedAt`,

                `## Fork Creation Flow

1. User clicks "Fork" on a message
2. POST /api/sfera/[id]/fork with messageId
3. Backend:
   - Creates new Sfera with auto-generated title
   - Copies original message to new Sfera
   - Creates fork relationship record
   - Copies all members from parent
   - Marks original message as forked
4. Frontend navigates to new Sfera`,

                `## API Endpoints

POST /api/sfera/[id]/fork
- Creates fork from message
- Returns new Sfera data

GET /api/sfera
- Returns all user's Sferas
- Includes fork relationships for graph viz

GET /api/sfera/[id]
- Returns Sfera details
- Includes parent Sfera info if forked
- Includes messages with fork status`,
              ],
            },
          },
          {
            forkFromMessage: 4,
            node: {
              title: "Graph Visualization - Implementation",
              description: "How the graph visualization works",
              messages: [
                `# Graph Visualization Implementation

The graph view uses HTML5 Canvas + positioned React elements.`,

                `## Architecture

Two-layer approach:
1. Canvas layer: Draws connection lines
2. DOM layer: Renders interactive Sfera cards

Benefits:
- Smooth curved lines with Bezier curves
- Interactive cards with React
- Hardware-accelerated rendering
- Easy hover/click detection`,

                `## Layout Algorithms

**Tree Layout:**
- Calculates depth of each node
- Groups nodes by level
- Distributes horizontally within level
- Draws from top to bottom

**Circular Layout:**
- Used when no fork relationships exist
- Places nodes around a circle
- Evenly distributes angles
- Centered in viewport`,

                `## Technical Stack

- React useState/useRef for state
- useEffect for layout calculations
- Canvas 2D context for drawing
- Absolute positioning for cards
- Mouse events for interaction

The code is in:
app/(sfera)/sferas/page.tsx`,
              ],
            },
          },
        ],
      },
    },
    {
      forkFromMessage: 2, // Fork from "Current Status" message
      node: {
        title: "Roadmap & Future Features",
        description: "Planned features and development roadmap",
        messages: [
          `# Sfera Roadmap

What's coming next to Sfera.`,

          `## Phase 1: Enhanced Collaboration (Current)

🎯 High Priority:
- [ ] Real-time message updates (WebSocket)
- [ ] @mentions in messages
- [ ] Notification system
- [ ] Read receipts
- [ ] Typing indicators`,

          `## Phase 2: Discovery & Search

🔍 Making content findable:
- [ ] Full-text search across Sferas
- [ ] Search within a Sfera
- [ ] Filter by member, date, fork status
- [ ] Saved searches
- [ ] Tag system`,

          `## Phase 3: Rich Content

📎 Beyond text:
- [ ] File attachments
- [ ] Image uploads
- [ ] Code syntax highlighting
- [ ] Markdown rendering
- [ ] Link previews
- [ ] Reactions to messages`,

          `## Phase 4: Advanced Features

🚀 Power user features:
- [ ] Merge forked Sferas back to parent
- [ ] Sfera templates
- [ ] Export conversations
- [ ] API access
- [ ] Integrations (Slack, Discord, etc.)
- [ ] Mobile apps`,

          `## Phase 5: AI & Analytics

🤖 Smart features:
- [ ] AI summarization of long threads
- [ ] Suggested fork points
- [ ] Conversation analytics
- [ ] Topic clustering
- [ ] Smart notifications`,
        ],
        children: [
          {
            forkFromMessage: 1,
            node: {
              title: "Real-time Features - Technical Plan",
              description:
                "Implementation plan for WebSocket and real-time features",
              messages: [
                `# Real-time Features - Implementation Plan

How we'll add real-time collaboration to Sfera.`,

                `## WebSocket Architecture

Already scaffolded in codebase:
- lib/websocket/server.ts
- lib/websocket/use-websocket.ts hook

Need to implement:
- Message broadcast on send
- Member join/leave events
- Typing indicators
- Read receipt tracking`,

                `## Technical Approach

**Backend:**
- WebSocket server already exists
- Need to add event handlers:
  - 'message:new'
  - 'message:fork'
  - 'member:join'
  - 'member:leave'
  - 'typing:start'
  - 'typing:stop'

**Frontend:**
- Use existing useWebSocket hook
- Subscribe to Sfera room on mount
- Update local state on events
- Debounce typing indicators`,

                `## Database Considerations

- Add 'readBy' JSONB field to messages?
- Or separate 'messageRead' table?
- Redis for temporary typing state
- Presence tracking in Redis

Need to decide on persistence strategy.`,
              ],
            },
          },
          {
            forkFromMessage: 3,
            node: {
              title: "Rich Content - Design Spec",
              description: "Design specifications for rich content features",
              messages: [
                `# Rich Content Features - Design Spec

How to handle files, images, and rich media in Sfera.`,

                `## File Attachments

**UI Design:**
- Paperclip button next to Plus button
- Drag & drop zone in message input
- File preview before sending
- File cards in messages (with icon, name, size)

**Implementation:**
- Vercel Blob storage (already used in codebase)
- Upload endpoint: POST /api/files/upload
- Store metadata in message as JSONB
- Download endpoint with access control`,

                `## Image Handling

**UI Design:**
- Images shown inline in messages
- Click to expand fullscreen
- Gallery view for multiple images
- Thumbnail generation for performance

**Implementation:**
- Same Blob storage as files
- Image optimization with sharp
- Multiple sizes: thumbnail, medium, full
- Lazy loading with Intersection Observer`,

                `## Markdown & Code

**UI Design:**
- Toggle for markdown preview
- Code blocks with syntax highlighting
- Support for common markdown:
  - Headers, bold, italic
  - Lists, quotes
  - Links, images
  - Code blocks with language

**Implementation:**
- marked.js for parsing
- highlight.js for syntax
- Sanitize with DOMPurify
- Store raw markdown in DB`,
              ],
            },
          },
        ],
      },
    },
    {
      forkFromMessage: 0, // Fork from welcome message
      node: {
        title: "Getting Started Guide",
        description: "How to use Sfera - a guide for new users",
        messages: [
          `# Getting Started with Sfera

Welcome! Let's learn how to use Sfera effectively.`,

          `## Step 1: Create Your First Sfera

1. Click "New Sfera" button (+ icon)
2. Enter a title (e.g., "Team Planning")
3. Add a description (optional)
4. Choose visibility (private recommended)
5. Add at least one member by email
6. Click "Create Sfera"

You're now in your first Sfera!`,

          `## Step 2: Start a Discussion

Type a message in the input at the bottom:
- Messages support multiple lines
- Press Enter to send
- Use Shift+Enter for line breaks
- Cmd+Enter also sends

Try writing: "Let's plan our next sprint!"`,

          `## Step 3: Fork a Message

This is where Sfera gets interesting:

1. Find a message you want to explore deeper
2. Hover over it to see action buttons
3. Click the "Fork" button (branch icon)
4. A new Sfera is created with that message
5. All members are automatically added
6. Continue the discussion in the new branch

Example: Fork the message about sprint planning to create a dedicated space for each feature.`,

          `## Step 4: Navigate the Graph

Go back to /sferas to see your Sferas:
- Each circle is a Sfera
- Lines show fork relationships
- Hover to highlight
- Click to open

Watch your discussion network grow organically!`,

          `## Step 5: Manage Your Sfera

Click the Settings icon (gear) in the header:
- Edit title and description
- Add or remove members
- See member roles

Only owners and admins can access settings.`,

          `## Tips for Effective Use

**When to Fork:**
- Discussion goes off-topic
- Need deep dive on specific point
- Multiple ideas in one message
- Want to experiment with an idea

**Best Practices:**
- Keep Sfera titles descriptive
- Fork early and often
- Use the graph view to maintain context
- Add new members to relevant forks`,
        ],
      },
    },
  ],
};

async function createSferaFromNode(
  node: SferaNode,
  userId: string,
  memberIds: string[],
  parentMessageId?: string,
  parentSferaId?: string
): Promise<string> {
  console.log(`Creating Sfera: ${node.title}`);

  // Create Sfera
  const [newSfera] = await db
    .insert(sfera)
    .values({
      title: node.title,
      description: node.description,
      ownerId: userId,
      visibility: "private",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  console.log(`  Created Sfera: ${newSfera.id}`);

  // Add members
  const memberValues = [
    {
      sferaId: newSfera.id,
      userId,
      role: "owner" as const,
      joinedAt: new Date(),
    },
    ...memberIds.map((id) => ({
      sferaId: newSfera.id,
      userId: id,
      role: "member" as const,
      joinedAt: new Date(),
    })),
  ];

  await db.insert(sferaMember).values(memberValues);
  console.log(`  Added ${memberValues.length} members`);

  // Create messages
  const messageIds: string[] = [];
  for (const content of node.messages) {
    const [message] = await db
      .insert(sferaMessage)
      .values({
        sferaId: newSfera.id,
        content,
        userId,
        isForked: false,
        forkCount: 0,
        createdAt: new Date(),
      })
      .returning();
    messageIds.push(message.id);
  }
  console.log(`  Created ${messageIds.length} messages`);

  // Create fork relationship if this is a child
  if (parentMessageId && parentSferaId) {
    await db.insert(sferaForkedSfera).values({
      parentSferaId,
      forkedSferaId: newSfera.id,
      parentMessageId,
      createdById: userId,
      createdAt: new Date(),
    });

    // Mark parent message as forked
    await db
      .update(sferaMessage)
      .set({ isForked: true })
      .where(eq(sferaMessage.id, parentMessageId));

    console.log(`  Created fork relationship from message ${parentMessageId}`);
  }

  // Process children (forks)
  if (node.children) {
    for (const child of node.children) {
      const messageToFork = messageIds[child.forkFromMessage];
      if (messageToFork) {
        await createSferaFromNode(
          child.node,
          userId,
          memberIds,
          messageToFork,
          newSfera.id
        );
      }
    }
  }

  return newSfera.id;
}

async function main() {
  console.log("🌟 Initializing Sfera Documentation Structure\n");

  // Get user IDs from emails
  console.log("Finding users...");
  const users = await db
    .select()
    .from(user)
    .where(or(eq(user.email, OWNER_EMAIL), inArray(user.email, TEAM_EMAILS)));

  if (users.length === 0) {
    console.error(
      "❌ No users found. Please update OWNER_EMAIL and TEAM_EMAILS in the script."
    );
    process.exit(1);
  }

  const owner = users.find((u) => u.email === OWNER_EMAIL);
  if (!owner) {
    console.error("❌ Owner not found. Please check OWNER_EMAIL.");
    process.exit(1);
  }

  const memberIds = users
    .filter((u) => u.email !== OWNER_EMAIL)
    .map((u) => u.id);

  console.log(`Found owner: ${owner.email}`);
  console.log(`Found ${memberIds.length} team members\n`);

  // Create documentation structure
  console.log("Creating documentation Sferas...\n");
  const rootId = await createSferaFromNode(docsStructure, owner.id, memberIds);

  console.log("\n✅ Documentation structure created!");
  console.log(`\nRoot Sfera ID: ${rootId}`);
  console.log(`Visit: /sfera/${rootId}`);
  console.log("View graph: /sferas\n");
}

main()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
