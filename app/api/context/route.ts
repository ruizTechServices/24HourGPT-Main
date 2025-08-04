import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse, NextRequest } from 'next/server';

const dataDir = path.join(process.cwd(), 'data');

// Helper to get the file path for a given chat ID and prevent directory traversal
const getFilePath = (chatId: string) => {
  const safeChatId = path.basename(chatId);
  if (!safeChatId || safeChatId === '.' || safeChatId === '..') {
    throw new Error('Invalid chatId');
  }
  return path.join(dataDir, `${safeChatId}.jsonl`);
};

// Ensure the data directory exists
async function ensureDataDirExists() {
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// GET: Fetch all messages for a given chat ID
export async function GET(request: NextRequest) {
  const chatId = request.nextUrl.searchParams.get('chatId');
  if (!chatId) {
    return NextResponse.json({ message: 'chatId is required' }, { status: 400 });
  }

  try {
    const filePath = getFilePath(chatId);
    await fs.access(filePath);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const lines = fileContent.trim().split('\n').filter(line => line);
    const messages = lines.map(line => JSON.parse(line));
    return NextResponse.json(messages);
  } catch (error) {
    // If file doesn't exist, it's a new chat. Return empty array.
    return NextResponse.json([]);
  }
}

// POST: Add a new message to a chat
export async function POST(request: NextRequest) {
  await ensureDataDirExists();
  const chatId = request.nextUrl.searchParams.get('chatId');
  if (!chatId) {
    return NextResponse.json({ message: 'chatId is required' }, { status: 400 });
  }

  try {
    const newMessage = await request.json();
    const messageWithId = {
      ...newMessage,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

    const jsonlLine = JSON.stringify(messageWithId) + '\n';
    const filePath = getFilePath(chatId);

    await fs.appendFile(filePath, jsonlLine);
    return NextResponse.json(messageWithId, { status: 201 });
  } catch (error) {
    console.error('Error writing to context file:', error);
    return NextResponse.json({ message: 'Error writing to context file' }, { status: 500 });
  }
}

// PUT: Upload and overwrite a chat history file
export async function PUT(request: NextRequest) {
    await ensureDataDirExists();
    const chatId = request.nextUrl.searchParams.get('chatId');
    if (!chatId) {
        return NextResponse.json({ message: 'chatId is required' }, { status: 400 });
    }

    try {
        const filePath = getFilePath(chatId);
        const body = await request.text();

        // Basic validation for JSONL format
        const lines = body.trim().split('\n');
        for (const line of lines) {
            JSON.parse(line); // Will throw an error if a line is not valid JSON
        }

        await fs.writeFile(filePath, body);
        return NextResponse.json({ message: 'File uploaded successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json({ message: 'Invalid JSONL format or failed to write file' }, { status: 400 });
    }
}


// DELETE: Deletes a message from a chat
export async function DELETE(request: NextRequest) {
    const chatId = request.nextUrl.searchParams.get('chatId');
    const messageId = request.nextUrl.searchParams.get('messageId');

    if (!chatId || !messageId) {
        return NextResponse.json({ message: 'chatId and messageId are required' }, { status: 400 });
    }

    try {
        const filePath = getFilePath(chatId);
        await fs.access(filePath);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const lines = fileContent.trim().split('\n').filter(line => line);
        const messages = lines.map(line => JSON.parse(line));

        const filteredMessages = messages.filter(msg => msg.id !== messageId);

        const newFileContent = filteredMessages.map(msg => JSON.stringify(msg)).join('\n') + (filteredMessages.length > 0 ? '\n' : '');
        await fs.writeFile(filePath, newFileContent);

        return NextResponse.json({ message: 'Message deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting message:', error);
        return NextResponse.json({ message: 'Error deleting message' }, { status: 500 });
    }
}