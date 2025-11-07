# @avrora Integration in Sfera

## Overview

Avrora can now be summoned in any Sfera discussion by mentioning `@avrora` in your message. She will respond with context-aware answers based on the entire conversation history.

## How It Works

1. **Mention @avrora**: Type `@avrora` anywhere in your message
2. **Automatic Response**: Avrora will automatically respond after your message is sent
3. **Context-Aware**: Avrora sees the last 20 messages in the Sfera for context
4. **Visual Indicators**:
   - @avrora mentions are highlighted in blue
   - Avrora's messages have a gradient background (blue-purple)
   - Sparkles icon ✨ appears next to Avrora's name

## Usage Examples

### Basic Question
```
@avrora what are the main points from this discussion?
```

### Request for Ideas
```
@avrora can you suggest some approaches to this problem?
```

### Technical Help
```
@avrora help me understand this code snippet
```

### Russian Support
```
@аvrora помоги разобраться с этой задачей
```

## Features

- **Automatic Membership**: Avrora automatically joins Sferas when mentioned
- **Context-Aware**: Uses last 20 messages for context
- **Fork-Aware**: Avrora understands the fork-based structure
- **Async Processing**: Responses generated asynchronously (don't block message sending)
- **Visual Styling**:
  - Gradient background for Avrora's messages
  - Highlighted @avrora mentions
  - Sparkles icon identifier

## Technical Details

### Files Created/Modified

1. **lib/ai/sfera-avrora.ts** - Main Avrora logic for Sferas
2. **app/api/sfera/[id]/messages/route.ts** - Mention detection
3. **components/sfera/SferaMessage.tsx** - Visual styling
4. **lib/mentions/parser.ts** - Already existed, used for parsing

### Database

- Avrora is represented as a special user with ID: `00000000-0000-0000-0000-000000000001`
- Email: `avrora@avrora.click`
- Automatically added as member when first mentioned

### AI Model

- Uses `gpt-5-mini` model from MegaLLM
- Temperature: 0.7
- Max tokens: 1000
- Context: Last 20 messages

## Setup

Avrora will automatically work in any Sfera. No setup required!

The first time @avrora is mentioned in a Sfera:
1. Avrora user is created (if doesn't exist)
2. Avrora is added as a member
3. Response is generated

## Best Practices

- **Be Specific**: Ask clear, specific questions
- **Provide Context**: Avrora sees previous messages, but you can reference them
- **Fork When Needed**: If Avrora's response sparks a new discussion, fork it!
- **Multiple Questions**: You can ask multiple things, but separate questions work better

## Examples in Context

### Brainstorming Session
```
User1: We need to improve our onboarding flow
User2: Maybe we should add video tutorials
User3: @avrora what are some effective onboarding strategies?
Avrora: Based on your discussion about video tutorials, here are some effective strategies...
```

### Technical Discussion
```
Dev1: This function is getting too complex
Dev2: @avrora suggest ways to refactor this
Avrora: I see you're dealing with complexity. Here are some refactoring patterns...
```

### Planning
```
PM: We need to prioritize these features
@avrora help us create a prioritization framework
Avrora: Let me suggest a prioritization approach based on your goals...
```

## Future Enhancements

Planned improvements:
- [ ] Streaming responses (real-time typing)
- [ ] Avrora can suggest fork points
- [ ] Thread summarization
- [ ] Code understanding and suggestions
- [ ] Image understanding (when images are supported)
- [ ] Multi-language support improvements

## Troubleshooting

**Avrora doesn't respond:**
- Check that you used @avrora (with @)
- Wait a few seconds (async processing)
- Check browser console for errors

**Response takes too long:**
- Normal delay: 2-5 seconds
- Long delay (10+ seconds): Check API limits

**Styling issues:**
- Clear browser cache
- Check that all components are updated

## Support

If you encounter issues, check:
1. Browser console for errors
2. Server logs for API errors
3. Database for Avrora user existence
