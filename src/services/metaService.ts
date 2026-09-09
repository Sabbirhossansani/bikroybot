import { config } from '../config/env';

export class MetaService {
  /**
   * Send text message back to Facebook Messenger / Instagram DM
   */
  static async sendMessage(recipientPsid: string, text: string, pageToken?: string): Promise<boolean> {
    const accessToken = pageToken || config.meta.pageAccessToken;
    if (!accessToken) {
      console.warn('Meta Page Access Token not configured. Message logged to console instead:', text);
      return false;
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientPsid },
          message: { text }
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        console.error('Meta Graph API Error:', resData);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Failed to send message via Meta Graph API:', err);
      return false;
    }
  }

  /**
   * Send Quick Reply Buttons
   */
  static async sendQuickReplies(recipientPsid: string, text: string, options: Array<{ title: string; payload: string }>, pageToken?: string) {
    const accessToken = pageToken || config.meta.pageAccessToken;
    if (!accessToken) return;

    const quickReplies = options.map(opt => ({
      content_type: 'text',
      title: opt.title,
      payload: opt.payload
    }));

    try {
      await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientPsid },
          message: {
            text,
            quick_replies: quickReplies
          }
        })
      });
    } catch (err) {
      console.error('Failed to send Quick Replies:', err);
    }
  }
}
