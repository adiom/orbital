import React, { useState } from "react";

interface GroupChatInputProps {
  chatId: string;
  userId: string;
  onSend?: (message: string) => void;
}

export function GroupChatInput({
  chatId,
  userId,
  onSend,
}: GroupChatInputProps) {
  const [value, setValue] = useState("");

  const handleSend = () => {
    if (value.trim() && onSend) {
      onSend(value);
      setValue("");
    }
  };

  return (
    <div
      className="group-chat-input"
      style={{ display: "flex", gap: 8, padding: "0.5rem 0" }}
    >
      <input
        onChange={(e) => setValue(e.target.value)}
        placeholder="Введите сообщение..."
        style={{ flex: 1, padding: 8 }}
        type="text"
        value={value}
      />
      <button
        onClick={handleSend}
        style={{ padding: "8px 16px" }}
        type="button"
      >
        Отправить
      </button>
    </div>
  );
}
