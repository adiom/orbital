#!/usr/bin/env node
// scripts/mcp-cli-full.js - Full MCP server implementation
const process = require('node:process');

// Import ES modules dynamically since this is CommonJS
async function init() {
  try {
    // Load environment variables
    require('dotenv').config({ path: '.env.local' });
    
    // Import database and MCP functions
    const { db } = await import('../lib/db/index.ts');
    const { validateApiKey } = await import('../lib/auth/api-keys.js');
    const { checkMcpPermission } = await import('../lib/mcp/auth.js');
    const { 
      listSferas, 
      getSfera, 
      getSferaMessages, 
      getUserProfile, 
      searchSferas 
    } = await import('../lib/mcp/resources.js');
    const { 
      createSfera, 
      sendMessage, 
      invokeAvrora, 
      addMember, 
      forkSfera 
    } = await import('../lib/mcp/tools.js');
    
    // Get API key from environment
    const apiKey = process.env.AVRORA_API_KEY || process.env.MCP_API_KEY;
    if (!apiKey) {
      console.error('❌ Error: Set AVRORA_API_KEY or MCP_API_KEY environment variable');
      console.error('Example: export AVRORA_API_KEY="avr_live_YOUR_KEY"');
      process.exit(1);
    }

    // Validate API key and get user
    const apiKeyRecord = await validateApiKey(apiKey);
    if (!apiKeyRecord) {
      console.error('❌ Error: Invalid API key');
      process.exit(1);
    }

    // Get user info
    const [user] = await db
      .select()
      .from(require('../lib/db/schema.js').user)
      .where(require('drizzle-orm').eq(require('../lib/db/schema.js').user.id, apiKeyRecord.userId))
      .limit(1);

    if (!user) {
      console.error('❌ Error: User not found');
      process.exit(1);
    }

    if (!user.mcpEnabled) {
      console.error('❌ Error: MCP access not enabled for this user');
      process.exit(1);
    }

    console.error(`✅ MCP server initialized for user: ${user.email}`);

    // MCP server functions
    function write(obj) {
      process.stdout.write(JSON.stringify(obj) + '\n');
    }

    function ok(id, result) {
      write({ jsonrpc: '2.0', id, result });
    }

    function err(id, code, message, data) {
      write({ jsonrpc: '2.0', id, error: { code, message, data } });
    }

    // Process JSON-RPC requests
    process.stdin.setEncoding('utf8');
    let buffer = '';

    process.stdin.on('data', async chunk => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        
        let req;
        try { 
          req = JSON.parse(line); 
        } catch { 
          err(null, -32700, 'Parse error');
          continue; 
        }

        const { id, method, params = {} } = req;

        try {
          switch (method) {
            case 'initialize':
              ok(id, {
                protocolVersion: '2024-11-05',
                capabilities: {
                  resources: { list: true, read: true, search: true },
                  tools: { list: true, call: true }
                },
                serverInfo: { name: 'Avrora MCP CLI Server', version: '1.0.0' }
              });
              break;

            case 'resources/list':
              if (!checkMcpPermission(apiKeyRecord, 'resources')) {
                throw new Error('Permission denied: resources access required');
              }
              ok(id, {
                resources: [
                  { uri: 'sfera://list', name: 'Your Sferas', description: 'List of Sferas you have access to', mimeType: 'application/json' },
                  { uri: 'user://profile', name: 'Your Profile', description: 'Your user profile and settings', mimeType: 'application/json' }
                ]
              });
              break;

            case 'resources/read':
              if (!checkMcpPermission(apiKeyRecord, 'resources')) {
                throw new Error('Permission denied: resources access required');
              }
              
              const { uri } = params;
              if (!uri) {
                throw new Error('URI parameter is required');
              }

              let resource;
              if (uri === 'sfera://list') {
                resource = await listSferas(user.id);
              } else if (uri === 'user://profile') {
                resource = await getUserProfile(user.id);
              } else if (uri.startsWith('sfera://')) {
                const parts = uri.substring(8).split('/');
                const sferaId = parts[0];
                
                if (parts.length === 1) {
                  resource = await getSfera(sferaId, user.id);
                } else if (parts[1] === 'messages') {
                  resource = await getSferaMessages(sferaId, user.id, params.limit, params.offset);
                } else {
                  throw new Error(`Unknown resource URI: ${uri}`);
                }
              } else if (uri.startsWith('sfera://search')) {
                const url = new URL(uri);
                const query = url.searchParams.get('q');
                if (!query) {
                  throw new Error('Search query is required');
                }
                resource = await searchSferas(user.id, query);
              } else {
                throw new Error(`Unknown resource URI: ${uri}`);
              }
              
              ok(id, { contents: [resource] });
              break;

            case 'tools/list':
              if (!checkMcpPermission(apiKeyRecord, 'tools')) {
                ok(id, { tools: [] });
                break;
              }
              
              ok(id, {
                tools: [
                  {
                    name: 'createSfera',
                    description: 'Create a new Sfera discussion space',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'Sfera title' },
                        description: { type: 'string', description: 'Sfera description' },
                        visibility: { type: 'string', enum: ['public', 'private', 'dao'] },
                        members: { type: 'array', items: { type: 'string' } }
                      },
                      required: ['title']
                    }
                  },
                  {
                    name: 'sendMessage',
                    description: 'Send a message to a Sfera',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        sferaId: { type: 'string', description: 'Sfera ID' },
                        content: { type: 'string', description: 'Message content' },
                        parentMessageId: { type: 'string', description: 'Parent message ID' }
                      },
                      required: ['sferaId', 'content']
                    }
                  },
                  {
                    name: 'invokeAvrora',
                    description: 'Invoke Avrora AI to respond in a Sfera',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        sferaId: { type: 'string', description: 'Sfera ID' },
                        prompt: { type: 'string', description: 'Optional prompt' }
                      },
                      required: ['sferaId']
                    }
                  },
                  {
                    name: 'addMember',
                    description: 'Add a member to a Sfera',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        sferaId: { type: 'string', description: 'Sfera ID' },
                        memberIdentifier: { type: 'string', description: 'Email or user ID' },
                        role: { type: 'string', enum: ['admin', 'member', 'viewer'] }
                      },
                      required: ['sferaId', 'memberIdentifier']
                    }
                  },
                  {
                    name: 'forkSfera',
                    description: 'Fork a Sfera or message',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        sferaId: { type: 'string', description: 'Source Sfera ID' },
                        messageId: { type: 'string', description: 'Message ID to fork' },
                        title: { type: 'string', description: 'New Sfera title' },
                        description: { type: 'string', description: 'New Sfera description' }
                      },
                      required: ['sferaId', 'title']
                    }
                  }
                ]
              });
              break;

            case 'tools/call':
              if (!checkMcpPermission(apiKeyRecord, 'tools')) {
                throw new Error('Permission denied: tools access required');
              }

              const { name, arguments: args } = params;
              if (!name) {
                throw new Error('Tool name is required');
              }

              let toolResult;
              switch (name) {
                case 'createSfera':
                  toolResult = await createSfera(user.id, args);
                  break;
                case 'sendMessage':
                  toolResult = await sendMessage(user.id, args);
                  break;
                case 'invokeAvrora':
                  toolResult = await invokeAvrora(user.id, args);
                  break;
                case 'addMember':
                  if (!checkMcpPermission(apiKeyRecord, 'admin')) {
                    throw new Error('Permission denied: admin access required');
                  }
                  toolResult = await addMember(user.id, args);
                  break;
                case 'forkSfera':
                  toolResult = await forkSfera(user.id, args);
                  break;
                default:
                  throw new Error(`Unknown tool: ${name}`);
              }

              if (!toolResult.success) {
                throw new Error(toolResult.error || 'Tool execution failed');
              }

              ok(id, {
                content: [{
                  type: 'text',
                  text: JSON.stringify(toolResult.data, null, 2)
                }]
              });
              break;

            default:
              err(id, -32601, 'Method not found');
          }
        } catch (e) {
          err(id, -32603, e.message || 'Internal error');
        }
      }
    });

    process.stdin.on('end', () => {
      console.error('MCP server shutting down');
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to initialize MCP server:', error);
    process.exit(1);
  }
}

init();
