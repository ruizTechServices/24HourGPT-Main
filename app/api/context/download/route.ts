import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const dataDir = path.join(process.cwd(), 'data');

const getFilePath = (chatId: string) => {
  const safeChatId = path.basename(chatId);
  return path.join(dataDir, `${safeChatId}.jsonl`);
};

export async function GET(request: NextRequest) {
  const chatId = request.nextUrl.searchParams.get('chatId');
  if (!chatId) {
    return NextResponse.json({ message: 'chatId is required' }, { status: 400 });
  }

  const filePath = getFilePath(chatId);

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const headers = new Headers();
    headers.set('Content-Type', 'application/jsonl');
    headers.set('Content-Disposition', `attachment; filename="${chatId}.jsonl"`);
    return new Response(fileContent, { headers });
  } catch (error) {
    return NextResponse.json({ message: 'File not found or error reading file' }, { status: 404 });
  }
}