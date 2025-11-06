import React from "react";

interface GroupParticipant {
  userId: string;
  role: string;
}

interface GroupParticipantsListProps {
  chatId: string;
  participants?: GroupParticipant[];
}

export function GroupParticipantsList({
  chatId,
  participants = [],
}: GroupParticipantsListProps) {
  return (
    <section
      className="group-chat-participants"
      style={{ borderBottom: "1px solid #eee", padding: "0.5rem 0" }}
    >
      <strong>Участники:</strong>
      <ul style={{ margin: 0, paddingLeft: 24 }}>
        {participants.length === 0 ? (
          <li>Нет участников</li>
        ) : (
          participants.map((p) => (
            <li key={p.userId}>
              User {p.userId.slice(0, 8)}{" "}
              {p.role !== "member" ? `[${p.role}]` : null}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
