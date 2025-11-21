# Avrora Project Analysis

This document provides a detailed analysis of the Avrora project, a sophisticated, AI-powered collaborative platform. The analysis is based on the project's file structure, dependencies, and database schema.

## 1. High-Level Summary

Avrora is a **Next.js-based web application** designed for real-time, collaborative work centered around AI. Its core functionality revolves around "Sferas"—shared, persistent spaces where users can engage in threaded discussions, generate content with AI tools, and create various types of "Artifacts" (documents, code, images, etc.).

The platform is built for complex, stateful interactions, featuring group chats, AI model integration (Anthropic, Google, OpenAI), a Git-like forking mechanism for discussions, and a comprehensive API known as the Model Context Protocol (MCP) for programmatic access. It is a powerful tool for collaborative development, content creation, and AI-assisted workflows.

## 2. Core Concepts

The application's data model reveals several key concepts:

*   **Sfera**: The central collaboration space. A Sfera is a persistent, threaded discussion forum owned by a user. It has members with different roles (`owner`, `admin`, `member`), visibility settings (`public`, `private`), and contains a series of messages.
*   **Sfera Message**: The fundamental unit of interaction within a Sfera. A message is more than just text; it can contain attachments, results from AI tool executions, and can be the parent of a new, forked Sfera.
*   **Forking**: A key collaboration feature. Any message in a Sfera can be "forked" to create an entirely new Sfera, creating a parent-child relationship. This allows for branching conversations and exploring ideas without disrupting the original flow, similar to `git fork`.
*   **Artifact (Document)**: A piece of content generated within the platform, often linked to a Sfera. Artifacts have specific types (`text`, `code`, `image`, `sheet`, `mini-app`, `chart`, `game`), indicating a rich and varied content creation capability.
*   **AI Tools & Usage**: The platform is deeply integrated with AI. It tracks the execution of specific AI tools, logs AI usage (model, provider, token count, cost) for billing and monitoring, and allows users to interact with various AI models.
*   **MCP (Model Context Protocol)**: A dedicated API that allows external clients to interact with the Avrora platform. It uses API keys for authentication and logs all actions for security and auditing purposes. This suggests the platform can be used as a backend for other AI applications.
*   **Chat**: Alongside Sferas, the application supports more traditional personal and group chats, with features like member roles and read receipts.

## 3. Key Features

*   **User Authentication**: Standard email/password and magic link authentication.
*   **Collaborative Spaces (Sferas)**:
    *   Create, manage, and participate in shared Sferas.
    *   Role-based access control for members.
    *   Threaded discussions.
    *   Forking messages to create new Sferas.
*   **AI-Powered Content Generation**:
    *   Integration with multiple AI providers (Anthropic, Google, OpenAI, etc.).
    *   Execution of AI tools directly within messages.
    *   Tracking of AI tool results and usage metrics.
*   **Rich Artifact System**:
    *   Creation and management of diverse content types (code, documents, spreadsheets, images, games).
    *   Artifacts are linked to the Sfera and the message that created them.
*   **Real-time Communication**:
    *   Websocket server for real-time updates.
    *   Group chat functionality with user mentions.
*   **Developer API (MCP)**:
    *   Secure, key-based API for programmatic access.
    *   Detailed audit logging for all API calls.
*   **Rich Frontend**:
    *   A component-based UI built with React and Shadcn/ui.
    *   Includes specialized components like code editors, diff viewers, data grids, and charts.

## 4. Technology Stack

*   **Framework**: Next.js 15 (with App Router)
*   **Language**: TypeScript
*   **Database**: PostgreSQL
*   **ORM**: Drizzle ORM
*   **Authentication**: NextAuth.js (v5 Beta)
*   **Frontend**: React 19 (RC), Tailwind CSS, Shadcn/ui, Framer Motion
*   **AI Integration**: Vercel AI SDK (`@ai-sdk/*`), specific provider SDKs (Anthropic, OpenAI, etc.)
*   **Real-time**: `ws` (WebSocket)
*   **Code Quality**: Biome (for linting/formatting)
*   **Testing**: Playwright (for end-to-end testing)

## 5. Project Structure Overview

*   `app/`: The main application code, structured using the Next.js App Router.
    *   `api/`: Backend API routes, including the core `/api/sfera` logic.
    *   `(auth)/`: Authentication-related pages and logic.
    *   `(orbit)/`, `(chat)/`: Feature-specific UI and logic for different parts of the application.
*   `lib/`: Core business logic, utilities, and configurations.
    *   `db/`: Drizzle ORM setup, schema (`schema.ts`), and migration logic.
    *   `ai/`: Logic for interacting with AI models and the Vercel AI SDK.
    *   `mcp/`: Code related to the Model Context Protocol.
    *   `websocket/`: Real-time server implementation.
*   `components/`: Reusable React components, forming the application's design system.
*   `artifacts/`: Components and logic for handling the different types of "Artifacts" (code, sheet, text, etc.).
*   `scripts/`: Various utility and command-line scripts for database management, testing, etc.
*   `docs/`: Markdown documentation for APIs and integrations.