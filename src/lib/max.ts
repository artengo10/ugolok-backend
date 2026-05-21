const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN;
const MAX_CHAT_ID = process.env.MAX_CHAT_ID;

async function postToMax(body: object): Promise<string | null> {
  if (!MAX_BOT_TOKEN || !MAX_CHAT_ID) {
    console.warn('[Max] MAX_BOT_TOKEN or MAX_CHAT_ID not configured');
    return null;
  }
  try {
    const res = await fetch(`https://platform-api.max.ru/messages?chat_id=${MAX_CHAT_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': MAX_BOT_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error('[Max] Error:', await res.text());
      return null;
    }
    const data = await res.json() as any;
    // Пробуем разные форматы ответа MAX API
    const messageId = data?.message?.id ?? data?.message_id ?? data?.id ?? null;
    if (messageId) console.log('[Max] message_id:', messageId);
    else console.warn('[Max] no message_id in response:', JSON.stringify(data));
    return messageId ? String(messageId) : null;
  } catch (e) {
    console.error('[Max] Network error:', e);
    return null;
  }
}

async function editMaxMessage(messageId: string, text: string): Promise<void> {
  if (!MAX_BOT_TOKEN) return;
  try {
    const res = await fetch(`https://platform-api.max.ru/messages?message_id=${messageId}`, {
      method: 'PUT',
      headers: {
        'Authorization': MAX_BOT_TOKEN,
        'Content-Type': 'application/json',
      },
      // Отправляем текст без attachments — кнопки исчезают
      body: JSON.stringify({ text, attachments: [] }),
    });
    if (!res.ok) {
      console.error('[Max] Edit error:', await res.text());
    }
  } catch (e) {
    console.error('[Max] Edit network error:', e);
  }
}

export async function sendMaxMessage(text: string): Promise<string | null> {
  return postToMax({ text });
}

export async function sendMaxOrderMessage(
  text: string,
  confirmUrl: string,
  rejectUrl: string,
): Promise<string | null> {
  return postToMax({
    text,
    attachments: [{
      type: 'inline_keyboard',
      payload: {
        buttons: [[
          { type: 'link', text: '✅ Оплатил', url: confirmUrl },
          { type: 'link', text: '❌ Не оплатил', url: rejectUrl },
        ]],
      },
    }],
  });
}

export async function removeMaxOrderButtons(
  messageId: string,
  orderId: string,
  confirmed: boolean,
): Promise<void> {
  const statusLine = confirmed
    ? `✅ ОПЛАТА ПОДТВЕРЖДЕНА — заказ #${orderId.slice(-6).toUpperCase()}`
    : `❌ ЗАКАЗ ОТМЕНЁН — #${orderId.slice(-6).toUpperCase()}`;
  return editMaxMessage(messageId, statusLine);
}
