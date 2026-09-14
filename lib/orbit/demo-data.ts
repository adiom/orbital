import type { ForkRelationship, Orbit } from "@/hooks/use-orbit-layout";
import type { Message } from "@/components/chat/shared-message-type";

export type DemoOrbitPreview = {
  orbits: Orbit[];
  forkRelationships: ForkRelationship[];
};

export type DemoOrbitPayload = {
  sfera: Orbit;
  parentSfera: { id: string; title: string } | null;
  members: Array<{ userId: string; role: string; joinedAt: Date; email: string }>;
  messages: Message[];
};

export function buildDemoOrbitPreview(referenceDate = new Date()): DemoOrbitPreview {
  const base = new Date(referenceDate);
  const createdAt = new Date(base.getTime() - 1000 * 60 * 60 * 8);

  const orbits: Orbit[] = [
    {
      id: "demo-city-bike",
      title: "Какой велосипед реально лучше для города",
      description:
        "Реальное обсуждение про ежедневные поездки: гибрид или шоссейный, комфортная геометрия и удобство в пробках.",
      visibility: "public",
      role: "owner",
      createdAt: new Date(createdAt.getTime() - 1000 * 60 * 60 * 3),
      updatedAt: new Date(base.getTime() - 1000 * 60 * 60 * 2),
      ownerId: "demo-user",
      messageCount: 64,
      memberCount: 4,
      lastMessageAt: new Date(base.getTime() - 1000 * 60 * 60 * 2),
      recentParticipants: [
        { id: "p1", name: "Аня" },
        { id: "p2", name: "Саша" },
      ],
    },
    {
      id: "demo-city-bike-fork-brakes",
      title: "Дисковые тормоза или ободные: что лучше в городе",
      description:
        "Ветка про тормоза для ежедневных поездок и зимы — что реально удобнее и надежнее в городе.",
      visibility: "public",
      role: "member",
      createdAt: new Date(createdAt.getTime() - 1000 * 60 * 60 * 2),
      updatedAt: new Date(base.getTime() - 1000 * 60 * 60 * 1.5),
      ownerId: "demo-user",
      messageCount: 28,
      memberCount: 2,
      lastMessageAt: new Date(base.getTime() - 1000 * 60 * 60 * 1.5),
      recentParticipants: [{ id: "p3", name: "Илья" }],
    },
    {
      id: "demo-city-bike-fork-rack",
      title: "Нужны ли багажник, насос и набор инструментов",
      description:
        "Разбор, зачем в городе действительно нужен багажник, насос и маленький ремонтный набор.",
      visibility: "public",
      role: "member",
      createdAt: new Date(createdAt.getTime() - 1000 * 60 * 60 * 1.5),
      updatedAt: new Date(base.getTime() - 1000 * 60 * 60 * 1),
      ownerId: "demo-user",
      messageCount: 21,
      memberCount: 3,
      lastMessageAt: new Date(base.getTime() - 1000 * 60 * 60 * 1),
      recentParticipants: [{ id: "p4", name: "Лера" }],
    },
    {
      id: "demo-workspace",
      title: "Как организовать рабочее место для фокуса",
      description:
        "Практические советы из реальных обсуждений: два монитора, свет, порядок на столе и меньше отвлечений.",
      visibility: "public",
      role: "owner",
      createdAt: new Date(createdAt.getTime() - 1000 * 60 * 60 * 4),
      updatedAt: new Date(base.getTime() - 1000 * 60 * 60 * 3),
      ownerId: "demo-user",
      messageCount: 48,
      memberCount: 4,
      lastMessageAt: new Date(base.getTime() - 1000 * 60 * 60 * 3),
      recentParticipants: [{ id: "p5", name: "Миша" }],
    },
    {
      id: "demo-workspace-fork-monitor",
      title: "Один большой экран или два маленьких",
      description:
        "Ветка про формат рабочего стола для кода, переписки и видео — что реально помогает в работе.",
      visibility: "public",
      role: "member",
      createdAt: new Date(createdAt.getTime() - 1000 * 60 * 60 * 3),
      updatedAt: new Date(base.getTime() - 1000 * 60 * 60 * 2.2),
      ownerId: "demo-user",
      messageCount: 19,
      memberCount: 2,
      lastMessageAt: new Date(base.getTime() - 1000 * 60 * 60 * 2.2),
      recentParticipants: [{ id: "p6", name: "Нина" }],
    },
    {
      id: "demo-pc-build",
      title: "Собрать первый ПК без лишних трат",
      description:
        "Разбор из форумных тем: какие компоненты действительно важны в первом сборе и на что не стоит переплачивать.",
      visibility: "public",
      role: "owner",
      createdAt: new Date(createdAt.getTime() - 1000 * 60 * 60 * 5),
      updatedAt: new Date(base.getTime() - 1000 * 60 * 60 * 4.2),
      ownerId: "demo-user",
      messageCount: 53,
      memberCount: 3,
      lastMessageAt: new Date(base.getTime() - 1000 * 60 * 60 * 4.2),
      recentParticipants: [{ id: "p7", name: "Дима" }],
    },
    {
      id: "demo-pc-build-fork-ssd",
      title: "SSD или HDD: что реально важно",
      description:
        "Ветка про выбор накопителя и то, что действительно влияет на скорость и комфорт в повседневной работе.",
      visibility: "public",
      role: "member",
      createdAt: new Date(createdAt.getTime() - 1000 * 60 * 60 * 4),
      updatedAt: new Date(base.getTime() - 1000 * 60 * 60 * 3.7),
      ownerId: "demo-user",
      messageCount: 26,
      memberCount: 2,
      lastMessageAt: new Date(base.getTime() - 1000 * 60 * 60 * 3.7),
      recentParticipants: [{ id: "p8", name: "Оля" }],
    },
  ];

  const forkRelationships: ForkRelationship[] = [
    {
      parentSferaId: "demo-city-bike",
      forkedSferaId: "demo-city-bike-fork-brakes",
      createdAt: new Date(base.getTime() - 1000 * 60 * 60 * 1.5),
    },
    {
      parentSferaId: "demo-city-bike",
      forkedSferaId: "demo-city-bike-fork-rack",
      createdAt: new Date(base.getTime() - 1000 * 60 * 60 * 1.2),
    },
    {
      parentSferaId: "demo-workspace",
      forkedSferaId: "demo-workspace-fork-monitor",
      createdAt: new Date(base.getTime() - 1000 * 60 * 60 * 2.0),
    },
    {
      parentSferaId: "demo-pc-build",
      forkedSferaId: "demo-pc-build-fork-ssd",
      createdAt: new Date(base.getTime() - 1000 * 60 * 60 * 3.0),
    },
  ];

  return { orbits, forkRelationships };
}

export function getDemoOrbitPayload(orbitId: string, referenceDate = new Date()): DemoOrbitPayload | null {
  const { orbits } = buildDemoOrbitPreview(referenceDate);
  const orbit = orbits.find((item) => item.id === orbitId);

  if (!orbit) {
    return null;
  }

  const demoMessages: Message[] = [
    {
      id: `${orbitId}-m1`,
      content:
        orbit.id === "demo-city-bike"
          ? "Я в городе чаще выбираю гибрид, потому что он удобен и на асфальте, и на плохих дорогах."
          : orbit.id === "demo-workspace"
            ? "Свет и порядок на столе реально меняют способность фокусироваться в течение дня."
            : "Мне кажется, в первом ПК стоит сначала взять нормальный SSD и хорошую материнку, а не переплачивать за лишние фишки.",
      userId: "demo-user",
      userEmail: "demo@example.com",
      parentMessageId: null,
      isForked: false,
      forkedSferaId: null,
      createdAt: new Date(referenceDate.getTime() - 1000 * 60 * 45),
    },
    {
      id: `${orbitId}-m2`,
      content:
        orbit.id === "demo-city-bike"
          ? "Собственно, в пробках мне важнее комфортная посадка, чем скорость."
          : orbit.id === "demo-workspace"
            ? "С двумя мониторами я чувствую себя быстрее, но нужен один хороший основной экран."
            : "На старте лучше смотреть на баланс цена/производительность, а не на топовые модели.",
      userId: "demo-user-2",
      userEmail: "demo-2@example.com",
      parentMessageId: `${orbitId}-m1`,
      isForked: true,
      forkedSferaId: orbit.id === "demo-city-bike" ? "demo-city-bike-fork-brakes" : null,
      createdAt: new Date(referenceDate.getTime() - 1000 * 60 * 20),
    },
  ];

  const parentSfera =
    orbit.id === "demo-city-bike"
      ? { id: "demo-city-bike", title: "Какой велосипед реально лучше для города" }
      : orbit.id === "demo-workspace"
        ? { id: "demo-workspace", title: "Как организовать рабочее место для фокуса" }
        : orbit.id === "demo-pc-build"
          ? { id: "demo-pc-build", title: "Собрать первый ПК без лишних трат" }
          : null;

  return {
    sfera: orbit,
    parentSfera,
    members: [
      { userId: "demo-user", role: "owner", joinedAt: new Date(referenceDate.getTime() - 1000 * 60 * 60 * 24), email: "demo@example.com" },
      { userId: "demo-user-2", role: "member", joinedAt: new Date(referenceDate.getTime() - 1000 * 60 * 60 * 20), email: "demo-2@example.com" },
    ],
    messages: demoMessages,
  };
}
