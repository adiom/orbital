# Design Document: OrbitPage Enhancement

## Overview

Улучшение страницы OrbitPage для обеспечения production-ready пользовательского опыта при работе со сферами. Текущая реализация представляет собой минимальную обёртку без обработки ошибок, состояний загрузки и навигации. Новый дизайн добавит:

- Обработку состояний загрузки и ошибок
- Навигационные элементы (breadcrumbs, back button)
- Информационный хедер с метаданными сферы
- SEO-оптимизацию через Next.js metadata API
- Типобезопасную валидацию параметров
- Адаптивный дизайн для всех устройств

## Architecture

### Component Hierarchy

```
OrbitPage (Server Component)
├── Metadata Generation (generateMetadata)
├── Error Boundary (error.tsx)
├── Loading State (loading.tsx)
└── OrbitPageClient (Client Component)
    ├── OrbitHeader
    │   ├── Breadcrumbs
    │   ├── SferaInfo
    │   └── ActionButtons
    └── OrbitChat (existing)
```

### Data Flow

1. **Server-side**: OrbitPage получает params, валидирует ID, загружает базовые данные сферы
2. **Metadata**: generateMetadata загружает данные для SEO
3. **Client-side**: OrbitPageClient получает начальные данные, рендерит UI
4. **OrbitChat**: Существующий компонент получает данные и управляет чатом

### File Structure

```
app/(orbit)/orbit/[id]/
├── page.tsx              # Server component с metadata
├── loading.tsx           # Loading state
├── error.tsx             # Error boundary
└── not-found.tsx         # 404 page

components/orbit/
├── orbit-page-header.tsx # Новый хедер с breadcrumbs
└── orbit-chat.tsx        # Существующий компонент (без изменений)

lib/db/
└── queries.ts            # Новые query функции для сферы
```

## Components and Interfaces

### 1. OrbitPage (Server Component)

```typescript
// app/(orbit)/orbit/[id]/page.tsx
type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrbitPage({ params }: PageProps): Promise<JSX.Element>
```

**Responsibilities:**
- Валидация ID сферы
- Загрузка базовых данных сферы
- Проверка аутентификации
- Проверка доступа к сфере
- Рендеринг OrbitPageClient

### 2. generateMetadata

```typescript
export async function generateMetadata({ params }: PageProps): Promise<Metadata>
```

**Responsibilities:**
- Загрузка данных сферы для SEO
- Генерация title, description
- Генерация Open Graph метаданных
- Обработка отсутствующего описания

### 3. OrbitPageHeader (Client Component)

```typescript
type OrbitPageHeaderProps = {
  sfera: {
    id: string;
    title: string;
    description: string | null;
    visibility: 'public' | 'private' | 'dao';
    ownerId: string;
  };
  parentSfera: {
    id: string;
    title: string;
  } | null;
  memberCount: number;
  currentUserId: string | undefined;
  isOwnerOrAdmin: boolean;
};

export function OrbitPageHeader(props: OrbitPageHeaderProps): JSX.Element
```

**Responsibilities:**
- Отображение breadcrumbs с родительской сферой
- Отображение названия и описания сферы
- Отображение метаданных (участники, видимость)
- Кнопка настроек для владельцев/админов
- Кнопка возврата к списку сфер

### 4. Loading State

```typescript
// app/(orbit)/orbit/[id]/loading.tsx
export default function Loading(): JSX.Element
```

**Responsibilities:**
- Отображение скелетона хедера
- Отображение скелетона чата
- Информативное сообщение о загрузке

### 5. Error Boundary

```typescript
// app/(orbit)/orbit/[id]/error.tsx
'use client';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps): JSX.Element
```

**Responsibilities:**
- Обработка runtime ошибок
- Отображение понятного сообщения
- Кнопка повторной попытки
- Логирование ошибок

### 6. Not Found Page

```typescript
// app/(orbit)/orbit/[id]/not-found.tsx
export default function NotFound(): JSX.Element
```

**Responsibilities:**
- Отображение 404 для несуществующих сфер
- Кнопка возврата к списку сфер

## Data Models

### SferaWithMetadata

```typescript
type SferaWithMetadata = {
  id: string;
  title: string;
  description: string | null;
  visibility: 'public' | 'private' | 'dao';
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number;
  parentSfera: {
    id: string;
    title: string;
  } | null;
};
```

### Database Queries

```typescript
// lib/db/queries.ts

// Получить сферу с метаданными для хедера
export async function getSferaWithMetadata(
  sferaId: string,
  userId: string | undefined
): Promise<SferaWithMetadata | null>

// Проверить доступ пользователя к сфере
export async function checkSferaAccess(
  sferaId: string,
  userId: string | undefined
): Promise<{ hasAccess: boolean; role: string | null }>

// Получить родительскую сферу для breadcrumbs
export async function getParentSfera(
  sferaId: string
): Promise<{ id: string; title: string } | null>
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Loading indicator visibility
*For any* sfera ID, when navigating to the orbit page, a loading indicator should be displayed until data is loaded
**Validates: Requirements 1.1**

### Property 2: Unauthenticated redirect
*For any* sfera ID, when an unauthenticated user attempts to access the page, they should be redirected to the login page
**Validates: Requirements 2.4**

### Property 3: Header displays sfera title
*For any* sfera, when the page is loaded, the header should display the sfera's title
**Validates: Requirements 3.1, 5.1**

### Property 4: Back button presence
*For any* sfera, when the page is loaded, a back button to the sfera list should be present
**Validates: Requirements 3.2**

### Property 5: Breadcrumbs for forked sferas
*For any* forked sfera, when the page is loaded, breadcrumbs showing the parent sfera should be displayed
**Validates: Requirements 3.3**

### Property 6: Breadcrumb navigation
*For any* breadcrumb link, when clicked, the user should navigate to the corresponding sfera
**Validates: Requirements 3.4**

### Property 7: Page title matches sfera title
*For any* sfera, when the page is loaded, the document title should equal the sfera's title
**Validates: Requirements 4.1**

### Property 8: Meta description from sfera description
*For any* sfera with a description, when the page is loaded, the meta description should equal the sfera's description
**Validates: Requirements 4.2**

### Property 9: Open Graph metadata generation
*For any* sfera, when the page is loaded, Open Graph meta tags (og:title, og:description, og:type) should be present
**Validates: Requirements 4.3**

### Property 10: Header displays sfera description
*For any* sfera, when the page is loaded, the header should display the sfera's description (or empty if null)
**Validates: Requirements 5.2**

### Property 11: Member count display
*For any* sfera, when the page is loaded, the header should display the correct number of members
**Validates: Requirements 5.3**

### Property 12: Visibility status display
*For any* sfera, when the page is loaded, the header should display the visibility status (public/private/dao)
**Validates: Requirements 5.4**

### Property 13: Settings button for owners/admins
*For any* sfera, when the current user is an owner or admin, a settings button should be displayed
**Validates: Requirements 5.5**

### Property 14: ID validation
*For any* input parameter, when the page receives it, the sfera ID should be validated as a valid UUID
**Validates: Requirements 6.1**

### Property 15: Mobile layout adaptation
*For any* mobile viewport width (< 768px), when the page is rendered, the layout should adapt to mobile design
**Validates: Requirements 7.1**

### Property 16: Tablet layout adaptation
*For any* tablet viewport width (768px - 1024px), when the page is rendered, the layout should adapt to tablet design
**Validates: Requirements 7.2**

### Property 17: Desktop layout adaptation
*For any* desktop viewport width (> 1024px), when the page is rendered, the layout should use full-screen design
**Validates: Requirements 7.3**

## Error Handling

### Error Types

1. **NotFoundError**: Сфера не существует
   - Status: 404
   - UI: not-found.tsx
   - Action: Показать сообщение + кнопка возврата

2. **ForbiddenError**: Нет доступа к сфере
   - Status: 403
   - UI: Специальное сообщение в error.tsx
   - Action: Показать причину + кнопка возврата

3. **ValidationError**: Невалидный ID сферы
   - Status: 400
   - UI: error.tsx
   - Action: Показать сообщение о невалидном ID

4. **NetworkError**: Ошибка загрузки данных
   - Status: 500
   - UI: error.tsx
   - Action: Показать сообщение + кнопка retry

5. **UnauthorizedError**: Пользователь не аутентифицирован
   - Status: 401
   - UI: Redirect to /login
   - Action: Автоматический редирект

### Error Handling Strategy

```typescript
// В OrbitPage
try {
  // Валидация ID
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid sfera ID');
  }

  // Проверка аутентификации
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Проверка существования сферы
  const sfera = await getSferaWithMetadata(id, session.user.id);
  if (!sfera) {
    notFound(); // Триггерит not-found.tsx
  }

  // Проверка доступа
  const { hasAccess } = await checkSferaAccess(id, session.user.id);
  if (!hasAccess) {
    throw new ForbiddenError('You do not have access to this sfera');
  }

  // Рендер компонента
  return <OrbitPageClient ... />;
} catch (error) {
  // Error boundary обработает
  throw error;
}
```

## Testing Strategy

### Unit Tests

1. **Validation Tests**
   - Test ID validation with valid UUIDs
   - Test ID validation with invalid strings
   - Test missing parameters handling

2. **Component Tests**
   - Test OrbitPageHeader renders correctly
   - Test breadcrumbs display for forked sferas
   - Test settings button visibility for owners/admins
   - Test back button functionality

3. **Query Tests**
   - Test getSferaWithMetadata returns correct data
   - Test checkSferaAccess returns correct permissions
   - Test getParentSfera returns parent for forks

### Property-Based Tests

Используем **fast-check** для TypeScript/React property-based testing.

**Configuration**: Каждый property-based тест должен выполнять минимум 100 итераций.

**Test Tagging**: Каждый тест должен быть помечен комментарием:
```typescript
// Feature: orbit-page-enhancement, Property 1: Loading indicator visibility
```

**Property Tests**:

1. **Property 1**: Loading indicator visibility
   - Generate: Random sfera IDs
   - Test: Loading state appears before data loads

2. **Property 2**: Unauthenticated redirect
   - Generate: Random sfera IDs, unauthenticated sessions
   - Test: Redirect to /login occurs

3. **Property 3**: Header displays sfera title
   - Generate: Random sferas with various titles
   - Test: Header contains sfera title

4. **Property 4**: Back button presence
   - Generate: Random sferas
   - Test: Back button exists in DOM

5. **Property 5**: Breadcrumbs for forked sferas
   - Generate: Random forked sferas
   - Test: Breadcrumbs display parent sfera

6. **Property 6**: Breadcrumb navigation
   - Generate: Random breadcrumb links
   - Test: Clicking navigates to correct sfera

7. **Property 7**: Page title matches sfera title
   - Generate: Random sferas
   - Test: document.title equals sfera.title

8. **Property 8**: Meta description from sfera description
   - Generate: Random sferas with descriptions
   - Test: Meta description tag equals sfera.description

9. **Property 9**: Open Graph metadata generation
   - Generate: Random sferas
   - Test: OG meta tags exist (og:title, og:description, og:type)

10. **Property 10**: Header displays sfera description
    - Generate: Random sferas
    - Test: Header contains description or empty

11. **Property 11**: Member count display
    - Generate: Random sferas with varying member counts
    - Test: Displayed count matches actual count

12. **Property 12**: Visibility status display
    - Generate: Random sferas with different visibility
    - Test: Correct visibility badge displayed

13. **Property 13**: Settings button for owners/admins
    - Generate: Random sferas and user roles
    - Test: Settings button visible iff user is owner/admin

14. **Property 14**: ID validation
    - Generate: Random valid and invalid IDs
    - Test: Valid IDs pass, invalid IDs fail validation

15. **Property 15**: Mobile layout adaptation
    - Generate: Random mobile viewport widths
    - Test: Mobile-specific classes applied

16. **Property 16**: Tablet layout adaptation
    - Generate: Random tablet viewport widths
    - Test: Tablet-specific classes applied

17. **Property 17**: Desktop layout adaptation
    - Generate: Random desktop viewport widths
    - Test: Desktop-specific classes applied

### Integration Tests

1. **Full Page Load Flow**
   - Test complete page load with valid sfera
   - Test error handling for invalid sfera
   - Test redirect for unauthenticated user

2. **Navigation Flow**
   - Test breadcrumb navigation
   - Test back button navigation
   - Test settings button opens modal

3. **Responsive Behavior**
   - Test layout changes on viewport resize
   - Test mobile menu behavior
   - Test touch interactions on mobile

## Implementation Notes

### Next.js 15 Patterns

1. **Async Server Components**: OrbitPage использует async/await для загрузки данных
2. **Metadata API**: generateMetadata для SEO
3. **Error Boundaries**: error.tsx для обработки ошибок
4. **Loading States**: loading.tsx для состояний загрузки
5. **Not Found**: not-found.tsx для 404

### Performance Considerations

1. **Parallel Data Fetching**: Загружать sfera и parentSfera параллельно
2. **Caching**: Использовать Next.js cache для metadata
3. **Streaming**: Использовать Suspense для частичного рендеринга
4. **Optimistic Updates**: OrbitChat уже использует оптимистичные обновления

### Accessibility

1. **Semantic HTML**: Использовать правильные теги (nav, header, main)
2. **ARIA Labels**: Добавить aria-label для кнопок и ссылок
3. **Keyboard Navigation**: Обеспечить навигацию с клавиатуры
4. **Focus Management**: Управлять фокусом при навигации

### Styling

Использовать существующий дизайн-систему:
- Tailwind CSS для стилей
- Gradient backgrounds: `from-gray-50 via-blue-50/30 to-purple-50/30`
- Backdrop blur для хедера: `backdrop-blur-xl`
- Consistent spacing и typography

## Migration Strategy

1. **Phase 1**: Добавить новые компоненты без изменения существующих
2. **Phase 2**: Обновить OrbitPage для использования новых компонентов
3. **Phase 3**: Добавить error.tsx, loading.tsx, not-found.tsx
4. **Phase 4**: Добавить metadata generation
5. **Phase 5**: Тестирование и оптимизация

Существующий OrbitChat остаётся без изменений, обеспечивая обратную совместимость.
