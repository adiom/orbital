import type React from "react";

type GroupChatContainerProps = {
  children: React.ReactNode;
};

export function GroupChatContainer({ children }: GroupChatContainerProps) {
  return (
    <div
      className="group-chat-container"
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      {children}
    </div>
  );
}
