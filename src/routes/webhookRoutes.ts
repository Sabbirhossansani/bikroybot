import { Router, Request, Response } from 'express';
import { config } from '../config/env';
import { SupabaseService } from '../services/supabaseService';
import { OrderStateMachine } from '../services/orderStateMachine';
import { GeminiService } from '../services/geminiService';
import { MetaService } from '../services/metaService';

export const webhookRouter = Router();

/**
 * Meta Webhook Verification Endpoint (GET /api/v1/webhook)
 */
webhookRouter.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.meta.verifyToken) {
    console.log('Meta Webhook Verified Successfully!');
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

/**
 * Meta Webhook Incoming Event Receiver (POST /api/v1/webhook)
 */
webhookRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (body.object === 'page') {
      // Respond HTTP 200 immediately to Meta to prevent webhook timeouts
      res.status(200).send('EVENT_RECEIVED');

      for (const entry of body.entry) {
        const webhookEvent = entry.messaging[0];
        const pageId = entry.id;
        const psid = webhookEvent.sender?.id;

        if (!psid || !webhookEvent.message) continue;

        const messageText = webhookEvent.message.text || '';
        const attachmentUrl = webhookEvent.message.attachments?.[0]?.payload?.url;

        // 1. Get or create customer
        const customer = await SupabaseService.getOrCreateCustomer(pageId, psid);

        // 2. Fetch products
        const products = await SupabaseService.getProducts();

        // 3. Save incoming message
        await SupabaseService.saveMessage(customer.id, 'CUSTOMER', messageText, attachmentUrl, webhookEvent.message.mid);

        // 4. If bot is muted, skip AI response
        if (customer.is_bot_muted) continue;

        let replyText = '';

        if (attachmentUrl) {
          const imgRes = await GeminiService.processImageMatch(attachmentUrl, products);
          replyText = imgRes.replyText;
          if (imgRes.matchedProduct) {
            const draftOrder = customer.draft_order || {};
            draftOrder.productTitle = imgRes.matchedProduct.title;
            draftOrder.productPrice = imgRes.matchedProduct.price;
            await SupabaseService.updateCustomer(customer.id, { draft_order: draftOrder });
          }
        } else {
          const result = await OrderStateMachine.handleChatMessage(customer, messageText, products);
          replyText = result.replyText;
        }

        // 5. Send reply back to Messenger
        if (replyText) {
          await MetaService.sendMessage(psid, replyText);
          await SupabaseService.saveMessage(customer.id, 'BOT', replyText);
        }
      }
    } else {
      res.sendStatus(404);
    }
  } catch (err) {
    console.error('Meta Webhook Processing Error:', err);
    res.status(500).send('Internal Server Error');
  }
});
