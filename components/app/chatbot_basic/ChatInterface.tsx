'use client';

import { useState, useEffect, useRef } from 'react';
import generateUUID from '@/lib/functions/generateUUID';
import ContextWindow, { Message } from '@/components/app/chatbot_basic/ContextWindow';
import InputEmbedder from '@/components/app/chatbot_basic/input_embedder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Upload, PlusCircle } from 'lucide-react';

export default function ChatInterface() {
  const [chatId, setChatId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedChatId = localStorage.getItem('currentChatId');
    if (storedChatId) {
      setChatId(storedChatId);
    } else {
      handleNewChat();
    }
  }, []);

  useEffect(() => {
    if (!chatId) return;
    const fetchMessages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/context?chatId=${chatId}`);
        if (!response.ok) throw new Error('Failed to fetch messages.');
        const data = await response.json();
        setMessages(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMessages();
  }, [chatId]);

  const handleNewChat = () => {
    const newChatId = generateUUID();
    setChatId(newChatId);
    setMessages([]);
    localStorage.setItem('currentChatId', newChatId);
  };

  const handleEmbedding = async (text: string) => {
    if (!chatId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/context?chatId=${chatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error('Failed to send message.');
      const newMessage = await response.json();
      setMessages((prev) => [...prev, newMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!chatId) return;
    setError(null);
    try {
      const response = await fetch(`/api/context?chatId=${chatId}&messageId=${messageId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete message.');
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    }
  };

  const handleDownload = () => {
    if (!chatId) return;
    window.open(`/api/context/download?chatId=${chatId}`, '_blank');
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !chatId) return;
    setIsLoading(true);
    setError(null);
    try {
      const fileContent = await file.text();
      const response = await fetch(`/api/context?chatId=${chatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/jsonl' },
        body: fileContent,
      });
      if (!response.ok) throw new Error('Failed to upload file. Ensure it is a valid JSONL file.');
      const fetchResponse = await fetch(`/api/context?chatId=${chatId}`);
      const data = await fetchResponse.json();
      setMessages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
      if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <main className="flex flex-col h-fit max-w-4xl mx-auto p-3 sm:p-4">
      <header className="flex-shrink-0 mb-3 sm:mb-4">
        {messages.length === 0 && (
          <h1 className="text-xl sm:text-2xl font-bold mb-2 text-center sm:text-left">24HourGPT</h1>
        )}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Button onClick={handleNewChat} variant="outline" size="sm" className="flex-1 sm:flex-none min-w-0">
            <PlusCircle className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
          <Button onClick={handleDownload} variant="outline" size="sm" disabled={messages.length === 0} className="flex-1 sm:flex-none min-w-0">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" className="flex-1 sm:flex-none min-w-0">
            <Upload className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Upload</span>
          </Button>
          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
            accept=".jsonl"
          />
        </div>
        <p className="text-xs text-gray-500 truncate">ID: {chatId}</p>
      </header>
      
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 min-h-0">
          <ContextWindow messages={messages} onDeleteMessage={handleDeleteMessage} />
        </div>
        {error && <p className="text-red-500 text-sm py-2 px-1">{error}</p>}
        <div className="flex-shrink-0 pt-2">
          <InputEmbedder handleEmbedding={handleEmbedding} isLoading={isLoading} />
        </div>
      </div>
    </main>
  );
}