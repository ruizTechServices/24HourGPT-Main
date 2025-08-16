import { createClient } from '@/lib/clients/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  
  const chatId = request.nextUrl.searchParams.get('chatId');
  if (!chatId) {
    return NextResponse.json({ message: 'chatId is required' }, { status: 400 });
  }

  try {
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('sender, content, created_at') // Select only the relevant fields
      .eq('user_id', user.id)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!messages || messages.length === 0) {
      return NextResponse.json({ message: 'No chat history found for this ID.' }, { status: 404 });
    }

    // Convert the array of JSON objects to a JSONL string
    const jsonlContent = messages.map(msg => JSON.stringify(msg)).join('\n');

    const headers = new Headers();
    headers.set('Content-Type', 'application/jsonl');
    headers.set('Content-Disposition', `attachment; filename="${chatId}.jsonl"`);
    
    return new Response(jsonlContent, { headers });

  } catch (error) {
    console.error('Error fetching or formatting chat history for download:', error);
    return NextResponse.json({ message: 'Error fetching chat history' }, { status: 500 });
  }
}
