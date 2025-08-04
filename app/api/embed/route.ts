import { getTextEmbedding } from '@/lib/functions/openai/embeddings';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    // Validate input
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Invalid input text' }, { status: 400 });
    }

    // Call OpenAI API securely on the server
    const embedding = await getTextEmbedding(text);

    // Return the embedding to the client
    return NextResponse.json({ embedding });

  } catch (error) {
    console.error('API Error in /api/embed:', error);
    // Don't expose detailed error messages to the client
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
