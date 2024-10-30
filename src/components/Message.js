// src/components/Message.js

import React from 'react';

const Message = ({ role, content, timestamp }) => {
  const isUser = role === 'user';
  return (
    <div className={`mb-2 ${isUser ? 'text-right' : 'text-left'}`}>
      <div
        className={`inline-block p-2 rounded ${
          isUser ? 'bg-purple-600 text-white' : 'bg-gray-100'
        }`}
      >
        {content}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {new Date(timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default Message;