export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
): Promise<void> {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken')) return;
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ to: pushToken, title, body, sound: 'default' }),
    });
    if (!res.ok) console.error('[push] error:', await res.text());
  } catch (e) {
    console.error('[push] network error:', e);
  }
}
