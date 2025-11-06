import React from "react";

interface GroupMessageProps {
  userId: string;
  content: string;
  createdAt?: string;
  role?: string;
}

export function GroupMessage({ userId, content, createdAt, role }: GroupMessageProps) {
  return (
    <div className="group-message" style={{display:'flex', alignItems:'center', marginBottom:8}}>
      <div style={{width:32, height:32, borderRadius:16, background:'#d5d8ee', marginRight:8, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>
        {userId.slice(0,2).toUpperCase()}
      </div>
      <div>
        <span><strong>User {userId.slice(0,8)}</strong> {role && `[${role}]`}</span> <br />
        <span>{content}</span>
        <span style={{color:'#aaa', fontSize:'0.8em', marginLeft:12}}>{createdAt && new Date(createdAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
