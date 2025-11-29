# Sfera Query Functions Usage Examples

## isValidUUID

Validates if a string is a valid UUID v4.

```typescript
import { isValidUUID } from '@/lib/db/queries';

// Valid UUID v4
isValidUUID('550e8400-e29b-41d4-a716-446655440000'); // true

// Invalid UUID
isValidUUID('not-a-uuid'); // false
isValidUUID(''); // false
```

## getSferaWithMetadata

Fetches a Sfera with additional metadata including member count and parent info.

```typescript
import { getSferaWithMetadata } from '@/lib/db/queries';

const sferaData = await getSferaWithMetadata(sferaId, userId);

if (!sferaData) {
  // Sfera not found
  return null;
}

// Returns:
// {
//   id: string,
//   title: string,
//   description: string | null,
//   visibility: 'public' | 'private' | 'dao',
//   ownerId: string,
//   createdAt: Date,
//   updatedAt: Date,
//   memberCount: number,
//   parentSfera: { id: string, title: string } | null
// }
```

## checkSferaAccess

Checks if a user has access to a Sfera and returns their role.

```typescript
import { checkSferaAccess } from '@/lib/db/queries';

const { hasAccess, role } = await checkSferaAccess(sferaId, userId);

if (!hasAccess) {
  // User is not a member
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}

// role can be: 'owner' | 'admin' | 'member' | 'viewer' | null
const isOwnerOrAdmin = role === 'owner' || role === 'admin';
```

## getParentSfera

Gets the parent Sfera for breadcrumbs (if the Sfera is a fork).

```typescript
import { getParentSfera } from '@/lib/db/queries';

const parentSfera = await getParentSfera(sferaId);

if (parentSfera) {
  // This is a forked Sfera
  // parentSfera: { id: string, title: string }
  console.log(`Parent: ${parentSfera.title}`);
} else {
  // This is a root Sfera (not forked)
}
```

## Complete Example: OrbitPage

```typescript
import { auth } from '@/app/(auth)/auth';
import { redirect, notFound } from 'next/navigation';
import {
  isValidUUID,
  getSferaWithMetadata,
  checkSferaAccess,
} from '@/lib/db/queries';

export default async function OrbitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Validate ID
  if (!isValidUUID(id)) {
    throw new Error('Invalid Sfera ID');
  }

  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Fetch Sfera with metadata
  const sfera = await getSferaWithMetadata(id, session.user.id);
  if (!sfera) {
    notFound();
  }

  // Check access
  const { hasAccess, role } = await checkSferaAccess(id, session.user.id);
  if (!hasAccess) {
    throw new Error('You do not have access to this Sfera');
  }

  const isOwnerOrAdmin = role === 'owner' || role === 'admin';

  return (
    <div>
      <h1>{sfera.title}</h1>
      <p>Members: {sfera.memberCount}</p>
      {sfera.parentSfera && (
        <p>Forked from: {sfera.parentSfera.title}</p>
      )}
      {isOwnerOrAdmin && <button>Settings</button>}
    </div>
  );
}
```
