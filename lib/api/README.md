# API Validation Layer

This directory contains validation schemas and middleware for the Sfera API enhancement.

## Usage

### Validation Schemas

Import the schemas from `validation.ts`:

```typescript
import {
  createMessageSchema,
  paginationSchema,
  messageFilterSchema,
  agentRegistrationSchema,
} from '@/lib/api/validation';
```

### Validation Middleware

Use the `validateRequest` function in your API routes:

```typescript
import { NextRequest } from 'next/server';
import { validateRequest } from '@/lib/api/middleware';
import { createMessageSchema } from '@/lib/api/validation';

export async function POST(request: NextRequest) {
  // Validate request body
  const validation = await validateRequest(
    request,
    createMessageSchema,
    'body'
  );

  if (!validation.success) {
    return validation.response; // Returns 400 with error details
  }

  const { data } = validation;
  // Use validated data...
}
```

### Query Parameter Validation

```typescript
export async function GET(request: NextRequest) {
  // Validate query parameters
  const validation = await validateRequest(
    request,
    paginationSchema,
    'query'
  );

  if (!validation.success) {
    return validation.response;
  }

  const { cursor, limit } = validation.data;
  // Use validated query params...
}
```

### Route Parameter Validation

```typescript
import { validateParams } from '@/lib/api/middleware';
import { z } from 'zod';

const routeParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const validation = validateParams(params, routeParamsSchema);

  if (!validation.success) {
    return validation.response;
  }

  const { id } = validation.data;
  // Use validated params...
}
```

## Error Response Format

All validation errors return a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "content": ["String must contain at least 1 character(s)"],
      "email": ["Invalid email"]
    }
  }
}
```

## Requirements

- **2.1**: All validation schemas are defined with Zod
- **2.2**: Validation failures return 400 with detailed error messages
- **2.3**: Middleware supports strict mode configuration (future enhancement)
