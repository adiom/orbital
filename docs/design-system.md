# Orbital Design System

Живая, спокойная, премиальная эстетика. Не диаграмма, не доска, не редактор — а вселенная мыслей.

---

## Цвета

### Фон

| Контекст | Значение | Tailwind |
|---|---|---|
| Страница (живая карта) | `#FBFAF8` | `bg-[#fbfaf8]` |
| Страница (форма) | `from-[#F9FAFB] via-[#EFF6FF]/50 to-[#FAF5FF]/50` | `bg-gradient-to-br from-gray-50 via-blue-50/50 to-purple-50/50` |
| Карточка / popover | `#FFFFFF` | `bg-white` |
| Вторичный / muted | `#F4F4F5` | `bg-secondary` |

### Текст

| Роль | Значение | Tailwind |
|---|---|---|
| Основной текст | `#0A0A0C` | `text-foreground` |
| Заголовок ноды | `#171717` | `text-neutral-950` |
| Описание ноды | `#737373` | `text-neutral-500` |
| Метки, иконки | `#A3A3A3` | `text-neutral-400` |
| Приглушённый текст | `#71717A` | `text-muted-foreground` |
| Кнопки (на тёмном фоне) | `#FAFAFA` | `text-primary-foreground` |

### Границы

| Роль | Значение | Tailwind |
|---|---|---|
| Основная граница | `#E4E4E7` | `border-border` |
| Вход / input | `#E4E4E7` | `border-input` |
| Карточка (форма) | `#E5E7EB` | `border-gray-200` |
| Hover кольцо ноды | `rgba(229,229,229,0.8)` | `ring-neutral-200/80` |
| Статистика внизу | `rgba(255,255,255,0.7)` | `border-white/70` |

### Цвета состояний жизни

| Состояние | Точка | Glow | Кольцо |
|---|---|---|---|
| **Рождается** (born) | `#38BDF8` (sky-400) | `rgba(96,165,250,0.22)` | `from-sky-300/70 via-blue-200/30 to-transparent` |
| **Живёт** (alive) | `#34D399` (emerald-400) | `rgba(16,185,129,0.24)` | `from-emerald-300/80 via-teal-200/30 to-transparent` |
| **Созревает** (settled) | `#A78BFA` (violet-400) | `rgba(168,85,247,0.20)` | `from-violet-300/70 via-fuchsia-200/25 to-transparent` |
| **Тихо** (quiet) | `#D6D3D1` (stone-300) | `rgba(148,163,184,0.16)` | `from-stone-300/50 via-stone-200/20 to-transparent` |

### Градиенты фона (радиальные, фиксированные)

| Центр | Цвет | Распространение |
|---|---|---|
| `18% 12%` (левый верх) | `rgba(168,85,247,0.10)` фиолетовый | `transparent 28%` |
| `80% 8%` (правый верх) | `rgba(59,130,246,0.09)` синий | `transparent 30%` |
| `54% 72%` (центр низ) | `rgba(16,185,129,0.07)` изумрудный | `transparent 34%` |

Белая плёнка поверх: `rgba(255,255,255,0.55)` — выравнивает контраст.

---

## Типографика

### Шрифты

| Токен | Шрифт |
|---|---|
| `--font-sans` | Geist Sans |
| `--font-mono` | Geist Mono |

### Масштаб

| Использование | Размер | Вес | Трекинг |
|---|---|---|---|
| Базовый текст | `16px` | — | — |
| Заголовок формы | `30px` (`text-3xl`) | 700 (bold) | `-0.04em` |
| Заголовок пустого состояния | `30px` (`text-3xl`) | 500 (medium) | `-0.04em` |
| Заголовок ноды | `16px × scale` | 500 (medium) | `-0.01em` |
| Текст кнопки | `14px` (`text-sm`) | 500 (medium) | — |
| Метки форм | `14px` (`text-sm`) | 600 (semibold) | — |
| Описание ноды | `11.5px × scale` | normal | — |
| Статистика внизу | `11px` | — | — |
| Бренд-метка / метки | `11px` (`text-[11px]`) | — | `0.34em` |
| Метка состояния жизни | `10px` | 500 (medium) | `0.2em` |
| Пилюли / бейджи | `10px` | — | — |
| Метка активности | `10.5px` | — | — |
| Инициалы участников | `9px` | 500 (medium) | — |

### Сокращения текста

- `line-clamp-2` — заголовки и описания нод
- `uppercase` — метки состояний, бренд-метка
- `tracking-[0.34em]` — бренд-метка "ORBITAL"
- `tracking-[0.2em]` — метки состояний жизни

---

## Кнопки

### Варианты (CVA)

| Вариант | Фон | Текст | Hover |
|---|---|---|---|
| **default** | `#18181B` | `#FAFAFA` | `rgba(24,24,27,0.9)` |
| **destructive** | `#EF4444` | `white` | `rgba(239,68,68,0.9)` |
| **outline** | прозрачный | `#18181B` | `#F4F4F5` |
| **secondary** | `#F4F4F5` | `#18181B` | `rgba(244,244,245,0.8)` |
| **ghost** | прозрачный | `#18181B` | `#F4F4F5` |
| **link** | прозрачный | `#18181B` + underline | — |

### Размеры

| Размер | Высота | Горизонтальный padding |
|---|---|---|
| `default` | `36px` (`h-9`) | `16px` (`px-4`) |
| `sm` | `32px` (`h-8`) | `12px` (`px-3`) |
| `lg` | `40px` (`h-10`) | `24px` (`px-6`) |
| `icon` | `36×36px` (`size-9`) | — |
| `icon-sm` | `32×32px` (`size-8`) | — |
| `icon-lg` | `40×40px` (`size-10`) | — |

### Общие стили

- `rounded-md` — `6px` скругление
- `transition-all` — плавные переходы
- `disabled:opacity-50` + `disabled:pointer-events-none`
- `focus-visible:ring-ring/50 focus-visible:ring-[3px]`

### Плавающая кнопка «Создать...»

- `rounded-full` — `9999px`
- `bg-white/75` + `backdrop-blur-2xl`
- `px-5` (`20px` горизонтально)
- `text-neutral-800`, `text-sm`, `font-medium`
- Тень: `0 18px 50px rgba(15,23,42,0.10)`
- Hover: `bg-white`, тень `0 22px 70px rgba(15,23,42,0.14)`
- Иконка `Plus` слева, `h-4 w-4`, `mr-2`

---

## Карточки и контейнеры

### Карточка-нода (живая сфера)

| Свойство | Значение |
|---|---|
| Ширина | `230px × scale` |
| Min высота | `148px × scale` |
| Padding | `15px × scale` (верт.), `17px × scale` (гориз.) |
| Скругление | `28px` (`rounded-[28px]`) |
| Фон | `rgba(255,255,255,0.72)` |
| Hover фон | `rgba(255,255,255,0.88)` |
| Backdrop blur | `24px` (`backdrop-blur-2xl`) |
| Тень по умолчанию | `0 24px 80px rgba(15,23,42,0.10)` |
| Тень при hover | `0 30px 100px rgba(15,23,42,0.14)` |
| Динамическая тень | `0 22px ${54×scale}px rgba(15,23,42,0.10), 0 0 ${42×scale}px ${glow}` |
| Кольцо (выбрана) | `ring-1 ring-blue-300/70` |
| Кольцо (не выбрана) | `ring-1 ring-white/70` |
| Hover подъём | `-translate-y-1` (`4px` вверх) |
| Переход | `transition-all duration-500` |
| Анимация | `orbital-float` (`12s ease-in-out infinite`) |

### Масштабирование по активности

| Условие | Scale |
|---|---|
| `childCount ≥ 5` или `density > 0.8` | `1.32` |
| `childCount ≥ 3` или `density > 0.55` | `1.18` |
| `childCount ≥ 1` или `density > 0.3` | `1.07` |
| По умолчанию | `1.0` |

### Внешнее свечение (glow ring)

- Позиция: `-inset-4` (`16px` наружу)
- Скругление: `36px`
- Фон: градиент состояния
- Прозрачность: `70%` (по умолч.), `100%` (hover)
- Blur: `blur-xl` (`16px`)
- Переход: `opacity duration-500`

### Внутренняя линия

- Позиция: `inset-x-5 top-0`, высота `1px`
- Градиент: `from-transparent via-white to-transparent`

### Форма (создание)

| Свойство | Значение |
|---|---|
| Скругление | `24px` (`rounded-3xl`) |
| Граница | `2px solid #E5E7EB` |
| Фон | `#FFFFFF` |
| Padding | `32px` (`p-8`) |
| Тень | `shadow-xl` |

---

## Статистика (нижняя панель)

- Позиция: `fixed bottom-6 left-6 z-20`
- Скругление: `rounded-full`
- Граница: `border-white/70`
- Фон: `bg-white/55` + `backdrop-blur-2xl`
- Padding: `16px × 8px` (`px-4 py-2`)
- Текст: `11px`, `text-neutral-400`
- Тень: `0 18px 60px rgba(15,23,42,0.08)`
- Видимость: только на десктопе (`hidden md:block`)

---

## Элементы ноды

### Полоска плотности

- Высота: `4px`
- Фон: `bg-neutral-100/80`, скруглённый
- Заполнение: `bg-gradient-to-r from-sky-300 via-emerald-300 to-violet-300`, скруглённый
- Ширина: `max(18%, density × 100%)`
- Переход: `transition-all duration-700`

### Инициалы участников

- Размер: `24×24px` (`6 × 6`)
- Скругление: `rounded-full`
- Граница: `1px solid white`
- Фон: `#171717` (`bg-neutral-900`)
- Текст: `9px`, `font-medium`, `text-white`
- Тень: `shadow-sm`
- Наложение: `-space-x-2` (`-8px`)

### Бейдж форка

- Фон: `bg-white/70`
- Padding: `8px × 4px` (`px-2 py-1`)
- Скругление: `rounded-full`
- Текст: `10px`, `text-neutral-500`
- Тень: `shadow-sm`

### Метка активности

- Размер: `10.5px`
- Цвет: `text-neutral-400`
- Строка: `leading-none`

### Кнопки действий (настройки / удаление)

- Размер: `24×24px` (`h-6 w-6`)
- Скругление: `rounded-full`
- Фон: `bg-white/60`
- Настройки hover: `bg-white`, `text-neutral-700`
- Удаление hover: `bg-red-50`, `text-red-500`
- Иконки: `12×12px` (`h-3 w-3`)

---

## Поля ввода

| Свойство | Значение |
|---|---|
| Скругление | `12px` (`rounded-xl`) |
| Граница | `2px` |
| Label | `14px`, `font-semibold` |
| Отступ label → input | `8px` (`mt-2`) |
| Textarea min-height | `80px` |
| Select | тот же стиль что input |

---

## Скругления

| Класс | Значение |
|---|---|
| `rounded-sm` | `4px` |
| `rounded-md` | `6px` |
| `rounded-lg` / `--radius` | `8px` |
| `rounded-xl` | `12px` |
| `rounded-3xl` | `24px` |
| `rounded-[28px]` | карточка ноды |
| `rounded-[36px]` | glow ring ноды |
| `rounded-full` | `9999px` |

---

## Тени

| Контекст | Определение |
|---|---|
| `shadow-xs` | `0 1px 2px 0 rgba(0,0,0,0.05)` |
| `shadow-sm` | `0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)` |
| `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` |
| `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` |
| `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)` |
| Нода (по умолч.) | `0 24px 80px rgba(15,23,42,0.10)` |
| Нода (hover) | `0 30px 100px rgba(15,23,42,0.14)` |
| Нода (динамическая) | `0 22px ${54×scale}px rgba(15,23,42,0.10), 0 0 ${42×scale}px ${glow}` |
| Кнопка «Создать» | `0 18px 50px rgba(15,23,42,0.10)` |
| Кнопка «Создать» hover | `0 22px 70px rgba(15,23,42,0.14)` |
| Статистика | `0 18px 60px rgba(15,23,42,0.08)` |
| Точка «живёт» | `0 0 20px rgba(16,185,129,0.55)` |
| Орб пустого состояния | `0 0 40px rgba(168,85,247,0.45)` |

---

## Анимации

### Ключевые кадры

| Название | Длительность | easing | Повтор |
|---|---|---|---|
| `orbital-float` | `12s` | `ease-in-out` | `infinite` |
| `orbital-drift` | `18s` | `ease-in-out` | `infinite` |
| `orbital-drift-slow` | `26s` | `ease-in-out` | `infinite reverse` |
| `constellation-pulse` | `3s` | `ease-out` | `infinite` |
| `constellation-pulse-focused` | `2s` | `ease-out` | `infinite` |
| `constellation-pulse-strong` | `1.8s` | `ease-out` | `infinite` |
| `accordion-down/up` | `0.2s` | `ease-out` | — |
| `fade-in` | `0.25s` | `ease-out` | `forwards` |
| `animate-ping` (точка alive) | `1s` | `cubic-bezier(0,0,0.2,1)` | `infinite` |
| `animate-spin` (загрузчик) | `1s` | `linear` | `infinite` |

### Переходы компонентов

| Компонент | Длительность |
|---|---|
| Нода (hover/выбор) | `duration-500` |
| Полоска плотности | `duration-700` |
| Нижняя панель (появление) | `duration-300` |
| Scrollbar thumb | `0.2s ease` |

### Текстура движений

- `orbital-float`: `translate3d(0, -8px, 0) rotate(0.25deg)` — узкие, медленные покачивания
- `orbital-drift`: `translate3d(18px, -16px, 0)` + opacity `0.42 → 0.86` — парящие частицы
- Все анимации отключаются при `prefers-reduced-motion: reduce`

---

## Частицы (окружение)

| Позиция | Размер | Цвет | Blur | Анимация |
|---|---|---|---|---|
| `left-[12%] top-32` | `8px` | `bg-sky-200/80` | `1px` | `orbital-drift` |
| `right-[18%] top-[38rem]` | `6px` | `bg-violet-200/80` | `1px` | `orbital-drift-slow` |
| `left-[68%] top-[18rem]` | `4px` | `bg-emerald-200/80` | `1px` | `orbital-drift` |

---

## Рёбра (связи)

| Свойство | Значение |
|---|---|
| Цвет | `rgba(120,113,108,0.22)` |
| Ширина | `1.4px` |
| Окантовка | `round` |
| Анимация | нет |
| Стиль | кривые Безье, без стрелок |

---

## Лейаут (констелляция)

| Константа | Значение |
|---|---|
| `NODE_WIDTH` | `280px` |
| `NODE_HEIGHT` | `210px` |
| `CANVAS_CENTER_X` | `720px` |
| `ROOT_Y` | `220px` |
| `CHILD_Y_GAP` | `330px` |
| `ROW_Y_GAP` | `245px` |
| Макс. колонки (>6 детей) | `4` |
| Макс. колонки (≤6 детей) | `3` |
| Гориз. зазор (>6 детей) | `315px` |
| Гориз. зазор (≤6 детей) | `365px` |
| Гориз. зазор (корни) | `440px` |
| Вертик. зазор (корни) | `720px` |
| Органическое смещение X | `sin(index × 1.73) × 38px` |
| Органическое смещение Y | `cos(index × 1.17) × 28px` |
| Мин. высота графа | `760px` |
| Нижний padding графа | `280px` |
| Clamp X | `min 170, max 1270` |

---

## Скроллбар

- Ширина: `6px`
- Thumb фон: `var(--border)`
- Thumb hover: `var(--muted-foreground) × 0.5`
- Thumb скругление: `3px`
- Track: прозрачный
- Firefox: `scrollbar-width: thin`

---

## Принципы

1. **Белое пространство** — использовать осознанно, не заполнять
2. **Мягкая глубина** — карточки парят, тени живые, blur
3. **Органические связи** — кривые, не стрелки; рост, не инженерия
4. **Спокойное движение** — медленные переходы, `ease-in-out`, без дёрганий
5. **Состояния жизни** — каждый объект отражает свою историю
6. **Масштаб по смыслу** — больше активности = больше карточка
7. **Нет слов** — если можно сказать глаголом, не говорить существительным
