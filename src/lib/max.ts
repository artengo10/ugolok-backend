const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN;
const MAX_CHAT_ID = process.env.MAX_CHAT_ID;

export async function sendMaxMessage(text: string): Promise<void> {
  if (!MAX_BOT_TOKEN || !MAX_CHAT_ID) {
    console.warn('[Max] MAX_BOT_TOKEN or MAX_CHAT_ID not configured');
    return;
  }
  try {
    const res = await fetch(`https://platform-api.max.ru/messages?chat_id=${MAX_CHAT_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': MAX_BOT_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      console.error('[Max] Error:', await res.text());
    }
  } catch (e) {
    console.error('[Max] Network error:', e);
  }
}
