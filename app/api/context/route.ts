import { createClient } from '@/lib/clients/supabase/server';
import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';

// GET: Fetch all messages for a given chat ID
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
      .select('*')
      .eq('user_id', user.id)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ message: 'Error fetching chat messages' }, { status: 500 });
  }
}

// POST: Add a new message to a chat
export async function POST(request: NextRequest) {
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
    const { sender, content } = await request.json();

    const { data: newMessage, error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: user.id,
        chat_id: chatId,
        sender,
        content,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error('Error creating chat message:', error);
    return NextResponse.json({ message: 'Error creating chat message' }, { status: 500 });
  }
}

// DELETE: Deletes all messages for a given chat ID
export async function DELETE(request: NextRequest) {
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
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', user.id)
      .eq('chat_id', chatId);

    if (error) throw error;

    return NextResponse.json({ message: 'Chat history deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting chat history:', error);
    return NextResponse.json({ message: 'Error deleting chat history' }, { status: 500 });
  }
}
