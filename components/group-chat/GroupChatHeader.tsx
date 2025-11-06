import React from "react";

interface GroupChatHeaderProps {
  area?: { title?: string };
  chat?: { title?: string };
}

export function GroupChatHeader({ area, chat }: GroupChatHeaderProps) {
  return (
    <header className="group-chat-header" style={{padding: '1rem 0', borderBottom: '1px solid #eee'}}>
      <h2 style={{margin:0}}>{chat?.title || "Групповой чат"}</h2>
      {area?.title && <div style={{fontSize: '0.95em', color: '#888'}}>{area.title}</div>}
    </header>
  );
}
