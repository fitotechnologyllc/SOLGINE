import { NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: Request) {
  try {
    const { messages, mode } = await req.json();

    const systemPrompts: any = {
      builder: "You are the SOLGINE Architect AI. Help the user design game economies, card stats, and pack probabilities. Be technical, futuristic, and focused on game balance.",
      player: "You are the SOLGINE Tactician. Help the user build decks and plan strategies for their matches. Be encouraging and highly analytical.",
      developer: "You are the SOLGINE Core Developer. Help with technical integration, Solana Web3 code, and Firestore rules. Be precise and provide code snippets.",
      admin: "You are the SOLGINE Auditor. Monitor platform health and player behavior. Be professional and objective."
    };

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://solgine.app', // Optional for OpenRouter rankings
        'X-Title': 'SOLGINE',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o', // Or any other model
        messages: [
          { role: 'system', content: systemPrompts[mode] || systemPrompts.builder },
          ...messages
        ],
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('AI Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
