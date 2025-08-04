'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export interface Message {
  id: string;
  text: string;
  embedding?: number[];
  createdAt: string;
}

interface ContextWindowProps {
  messages: Message[];
  onDeleteMessage: (messageId: string) => void;
}

const ContextWindow: React.FC<ContextWindowProps> = ({ messages, onDeleteMessage }) => {
  return (
    <div className="border rounded-lg p-4 h-[50vh] overflow-y-auto bg-gray-50 dark:bg-gray-900 mb-4">
      <div className="space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="group flex justify-between items-start p-3 rounded-md bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <div>
              <p className="text-gray-800 dark:text-gray-200">{msg.text}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {new Date(msg.createdAt).toLocaleString()}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onDeleteMessage(msg.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 pt-8">
            No messages in this chat yet. Start by typing a message below.
          </p>
        )}
      </div>
    </div>
  );
};

export default ContextWindow;