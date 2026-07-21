import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sfera, sferaMember, sferaMessage, user } from "@/lib/db/schema";

config({ path: ".env.local" });

if (!process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL is not defined");
}

const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
const db = drizzle(connection);

const DEV_EMAIL = "dev@canfly.org";
const SPACE_TITLE = "Раскрутка Orbital";
const SPACE_DESCRIPTION =
  "Операционная система запуска и монетизации: позиционирование, продвижение, загрузка, рост, удержание, монетизация, план на 12 недель.";

// Growth OS content, split into messages so it reads as a living thread.
const MESSAGES: string[] = [
  `# Orbital — операционная система запуска

Рабочие допущения (если что-то не так — переписать всё под факты):
- соло / крошечная команда, ограниченный бюджет
- первый рынок — B2C prosumer, не корпоративные продажи
- цель — от нуля до первой платящей аудитории и повторяемой выручки, не до раунда

Главное, что важнее всех блоков ниже: **всё держится на том, будет ли живая карта реально полезной, а не декоративной, и наступает ли момент «вау» при импорте своих диалогов.** Если это работает — стратегия раскручивается. Если нет — маркетинг не спасёт. Первые 4 недели именно про это.`,

  `## 1. Ниша: где именно мы выигрываем

Orbital стоит на пересечении трёх рынков — и позиционирование против каждого разное:
- **AI-чаты** (ChatGPT, Claude): черновик мышления, но всё теряется в линейной истории. «Кладбище гениальных диалогов».
- **PKM / заметки** (Notion, Obsidian, Tana, Reflect, Mem): мощно, но холодно и вручную. Проблема чистого листа.
- **AI-native мышление** (Mem, Saga, Notion AI): часто буксует — осталось «заметками с AI-припиской».

Наш клин один и конкретный: **проблема кладбища AI-диалогов**. У активного пользователя AI сотни ценных разговоров, которые умирают в ленте. Ни один инструмент не превращает их в живую связанную структуру без ручного труда.

⚠️ Главный риск: у конкурентов «граф» декоративный, им никто не пользуется. Мы обязаны сделать живую карту основным полезным интерфейсом (найти, воскресить, развить мысль), а не украшением. На этом продукт стоит или падает.`,

  `## 2. Аудитория (ICP для запуска)

Не «все, кто думает». Самый острый сегмент:
- соло-исследователи, фаундеры, консультанты, продакты, писатели, PhD, indie-hackers
- те, чья работа — генерация и связывание идей, кто уже пользуется AI ежедневно

Признак готовности платить: уже платит за ChatGPT Plus + Notion (иногда + Obsidian). Привычка платить за инструменты мышления сформирована.

Начинаем с одного вертикального среза (напр. AI-исследователи / build-in-public фаундеры). Один сегмент → одно сообщение → один канал. Расширение потом.`,

  `## 3. Конкуренты и несправедливое преимущество

- **ChatGPT / Claude** — сила: дистрибуция, качество. Слабость: линейная история, нет слоя знания. Мы дополняем, а не заменяем.
- **Notion** — сила: всё сразу, бренд. Слабость: ручной труд, холод, чистый лист. Мы — нулевое усилие и эмерджентная структура.
- **Obsidian** — сила: локально, граф, культ. Слабость: граф декоративный, всё вручную, кривая входа. Мы — авто-связывание и живость.
- **Mem / Saga / Reflect** — сила: AI-native, свежие. Слабость: остались «заметками с AI», не решают проблему кладбища диалогов. Мы — разговор как источник знания.

Несправедливое преимущество — не фичи (скопируют), а **позиция и метафора**: «разговоры становятся знанием» + живая карта как основной интерфейс. Notion и ChatGPT архитектурно завязаны на старые модели.`,

  `## 4. Позиционирование

Фраза для первого теста:
> **Orbital — место, где твои разговоры с AI становятся знанием.**

Лендинг:
- Проблема (крючок): «У тебя сотни гениальных диалогов с AI. Где они все сейчас?»
- Сдвиг: не архив, не чат, не заметки — живая карта твоих мыслей, которая связывает и оживляет себя сама.
- Обещание: ничего не теряется, всё связано, мысли развиваются.

Избегать в копи: «AI-чат», «база знаний», «граф», «заметки» — это чужие категории, где проиграем по фичам. Продаём состояние («ничего не теряется, мысли живут»), а не механику.`,

  `## 5. Система продвижения

Продукт визуальный и метафоричный — подарок для контента.
- **Основной канал:** build-in-public на X/Twitter + LinkedIn. Видео живой карты — скроллстоппер, аудитория живёт там.
- **Опорный актив:** демо-видео 30–60 сек «до/после»: хаос из 200 диалогов → оживающая карта. Переиспользовать везде.
- **Вторичное:** эссе-манифест «Почему AI-чаты — это кладбище идей». Задаёт категорию, притягивает ядро.
- **Первая сотня:** нишевые сообщества (r/PKM, r/ObsidianMD, r/Anthropic, Ness Labs, build-in-public Discord, Indie Hackers). Не спам — «строю решение вот этой боли».

Правило: один формат до результата, прежде чем добавлять второй.`,

  `## 6. Стратегия загрузки (первые пользователи)

Не открывать публичный запуск на сырой карте. Порядок:
1. **Приватная альфа (10–20 человек)** — лично, из сети и сообществ. Цель: наступает ли «вау», где отваливаются.
2. **Waitlist + build-in-public** — дефицит + тёплая аудитория к запуску.
3. **Импорт как хук активации** — дать импортировать историю ChatGPT/Claude, чтобы человек сразу увидел СВОЮ карту из СВОИХ диалогов. «Вау» за 30 секунд, решает проблему чистого листа. Вложиться в это раньше всего.
4. **Публичный запуск (Product Hunt / HN / Reddit)** — только когда альфа подтвердила «вау» и активацию.`,

  `## 7. Системы роста

- **Активация — единственная метрика в начале.** Определить жёстко: напр. «импортировал историю и открыл карту 3 раза» или «карта показала связь, которую он не заметил сам».
- **Встроенная виральность:** публичный профиль-гравитационное поле — виральный актив. Красивая карта, которой хочется поделиться = входящий трафик. Усилить шаринг ячейки/поля как красивого объекта.
- **Продолжения между людьми:** ветка чужой мысли (fork) — сетевой эффект. Фаза 2, не распыляться сейчас.
- **Loop:** импорт → вау → шаринг красивой карты → новый пользователь импортирует. Оптимизировать именно этот цикл.`,

  `## 8. Структура удержания

Держится на накопленной ценности и возврате.
- **Ценность растёт со временем:** чем больше карта, тем больнее уйти. Это ров.
- **Реактивация через жизнь карты:** состояния \`живёт\` / \`созревает\` / \`тихо\` как повод вернуться. Тихий дайджест «3 мысли созрели / давно молчат — вернуться?». Не спам, редкое ценное касание.
- **AI как двигатель возврата:** Avrora находит неожиданные связи между старыми диалогами — «две твои мысли из марта и июля об одном».
- **Ритуал:** еженедельный обзор мышления, а не ежедневный чат. Совпадает с ритмом ЦА.`,

  `## 9. План монетизации

Модель: **freemium с подпиской.** ЦА уже платит за ChatGPT + Notion.
- **Free:** щедрый, чтобы карта выросла и создала привязку. Лимит на ячейки / объём импорта / AI-действия Avrora в месяц.
- **Pro (~$10–15/мес):** безлимитная карта, полный импорт, безлимитная Avrora (семантический поиск, авто-связи, дайджесты), приватность/публикация полей. Держать ниже ChatGPT Plus ($20).
- **Ключевой платный триггер:** AI-функции (авто-связывание, семантический поиск, дайджесты созревания). За это платят, и это дорого по токенам — экономика сходится.

Порядок целей: сначала **retention недели 4**, потом **активация**, и только потом **выручка**. Монетизировать неудержанный продукт = лить воду в дырявое ведро.`,

  `## 10. Еженедельный график (12 недель)

**Фаза 1 — Момент «вау» (нед. 1–4)**
- Н1: жёстко определить activation event. Отполировать «вау» карты на реальных данных. Первый build-in-public пост.
- Н2: импорт истории ChatGPT/Claude → авто-построение карты. Приоритет №1.
- Н3: приватная альфа 10–20 человек. Смотреть, где отваливаются.
- Н4: первый сигнал удержания. Записать главное демо-видео (до/после).

**Фаза 2 — Активация и петля (нед. 5–8)**
- Н5: убрать топ-1 барьер активации. Открыть waitlist.
- Н6: шаринг красивого публичного поля/ячейки.
- Н7: Avrora находит связи между старыми диалогами. Эссе-манифест.
- Н8: тихий дайджест реактивации. Замерить retention недели 4.

**Фаза 3 — Запуск и монетизация (нед. 9–12)**
- Н9: retention подтверждён → готовить публичный запуск (лендинг, PH-ассеты). Иначе — назад чинить удержание.
- Н10: публичный запуск (Product Hunt + HN + Reddit).
- Н11: включить пейволл на AI-функции. Free/Pro.
- Н12: посчитать конверсию free→pro, отладить activation→paid. Зафиксировать повторяемое.`,
];

async function setupGrowthSpace() {
  console.log("🚀 Setting up growth/marketing space...\n");

  // 1. Create or get dev@canfly.org user
  console.log(`1️⃣  Ensuring user ${DEV_EMAIL}...`);
  let devUser = await db
    .select()
    .from(user)
    .where(eq(user.email, DEV_EMAIL))
    .limit(1)
    .then((res) => res[0]);

  if (devUser) {
    console.log(`   ✅ User already exists: ${devUser.id}`);
  } else {
    const [newUser] = await db
      .insert(user)
      .values({
        email: DEV_EMAIL,
        name: "Canfly Dev",
        displayName: "@dev",
      })
      .returning();
    devUser = newUser;
    console.log(`   ✅ Created user: ${devUser.id}`);
  }

  // 2. Create or get the growth space (internally a Sfera)
  console.log(`\n2️⃣  Ensuring space "${SPACE_TITLE}"...`);
  let space = await db
    .select()
    .from(sfera)
    .where(eq(sfera.title, SPACE_TITLE))
    .limit(1)
    .then((res) => res[0]);

  if (space) {
    console.log(`   ✅ Space already exists: ${space.id}`);
  } else {
    const [newSpace] = await db
      .insert(sfera)
      .values({
        title: SPACE_TITLE,
        description: SPACE_DESCRIPTION,
        ownerId: devUser.id,
        visibility: "private",
      })
      .returning();
    space = newSpace;
    console.log(`   ✅ Created space: ${space.id}`);
  }

  // 3. Ensure dev user is owner member
  console.log("\n3️⃣  Ensuring membership...");
  const existingMember = await db
    .select()
    .from(sferaMember)
    .where(eq(sferaMember.sferaId, space.id))
    .then((rows) => rows.find((m) => m.userId === devUser.id));

  if (existingMember) {
    console.log("   ✅ dev@canfly.org already a member");
  } else {
    await db.insert(sferaMember).values({
      sferaId: space.id,
      userId: devUser.id,
      role: "owner",
    });
    console.log("   ✅ Added dev@canfly.org as owner");
  }

  // 3b. Add adiom@list.ru as member (if present)
  console.log("\n3️⃣b Ensuring adiom@list.ru membership...");
  const ownerUser = await db
    .select()
    .from(user)
    .where(eq(user.email, "adiom@list.ru"))
    .limit(1)
    .then((res) => res[0]);

  if (ownerUser) {
    const ownerMember = await db
      .select()
      .from(sferaMember)
      .where(eq(sferaMember.sferaId, space.id))
      .then((rows) => rows.find((m) => m.userId === ownerUser.id));

    if (ownerMember) {
      console.log("   ✅ adiom@list.ru already a member");
    } else {
      await db.insert(sferaMember).values({
        sferaId: space.id,
        userId: ownerUser.id,
        role: "member",
      });
      console.log("   ✅ Added adiom@list.ru as member");
    }
  } else {
    console.log("   ⚠️  User adiom@list.ru not found - skipping");
  }

  // 4. Insert growth messages (idempotent via idempotencyKey)
  console.log("\n4️⃣  Writing growth content...");
  let inserted = 0;
  let skipped = 0;
  for (let i = 0; i < MESSAGES.length; i++) {
    const idempotencyKey = `growth-os-v1-${i}`;
    const already = await db
      .select({ id: sferaMessage.id })
      .from(sferaMessage)
      .where(eq(sferaMessage.idempotencyKey, idempotencyKey))
      .limit(1)
      .then((res) => res[0]);

    if (already) {
      skipped++;
      continue;
    }

    // Preserve order: stagger createdAt by index.
    const createdAt = new Date(Date.now() + i * 1000);
    await db.insert(sferaMessage).values({
      sferaId: space.id,
      userId: devUser.id,
      content: MESSAGES[i],
      messageType: "user",
      idempotencyKey,
      attachments: [],
      toolResults: [],
      createdAt,
      updatedAt: createdAt,
    });
    inserted++;
  }
  console.log(`   ✅ Messages inserted: ${inserted}, skipped (already present): ${skipped}`);

  console.log("\n" + "=".repeat(50));
  console.log("✨ Growth space ready!");
  console.log("=".repeat(50));
  console.log(`\n📝 User:  ${DEV_EMAIL} (${devUser.id})`);
  console.log(`📝 Space: "${SPACE_TITLE}" (${space.id})`);
  console.log(`📝 Open:  /orbit/${space.id}\n`);

  process.exit(0);
}

setupGrowthSpace().catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
});
