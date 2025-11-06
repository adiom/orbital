import React from "react";

interface GroupMessage {
  id: string;
  userId: string;
  content: string;
  createdAt?: string;
}

interface GroupMessagesListProps {
  chatId: string;
  messages: GroupMessage[];
}

export function GroupMessagesList({
  chatId,
  messages,
}: GroupMessagesListProps) {
  return (
    <div
      className="group-messages-list"
      style={{ flex: 1, overflowY: "auto", padding: "1rem 0" }}
    >
      {messages.length === 0 ? (
        <div style={{ color: "#888" }}>Нет сообщений</div>
      ) : (
        messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 12 }}>
            <strong>User {m.userId.slice(0, 8)}</strong>: {m.content}
            {m.createdAt && (
              <span
                style={{ fontSize: "0.85em", color: "#aaa", marginLeft: 8 }}
              >
                {new Date(m.createdAt).toLocaleString()}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
}
