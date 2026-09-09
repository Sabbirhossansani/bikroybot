import { Router, Request, Response } from 'express';
import { SupabaseService } from '../services/supabaseService';
import { OrderStateMachine } from '../services/orderStateMachine';
import { GeminiService } from '../services/geminiService';

export const apiRouter = Router();

/**
 * Auto-seed initial products if products table is empty
 */
async function ensureDefaultProducts() {
  try {
    const products = await SupabaseService.getProducts();
    if (!products || products.length === 0) {
      console.log('Seeding initial products into Supabase database...');
      await SupabaseService.addProduct({
        title: 'Rechargeable LED Desk Lamp & Cute Pen Holder',
        price: 850,
        category: 'Study',
        stock_status: 'IN_STOCK',
        description: 'Cute pink rechargeable LED desk lamp with gooseneck light and pen holder container'
      });
      await SupabaseService.addProduct({
        title: 'Retro TV Tissue Box with Phone Holder',
        price: 500,
        category: 'Home Decor',
        stock_status: 'OUT_OF_STOCK',
        description: 'Retro TV design tissue box with built-in smartphone holder stand'
      });
      await SupabaseService.addProduct({
        title: 'KIKI KI-499 Type-C Wired Earphones',
        price: 599,
        category: 'Gadgets',
        stock_status: 'IN_STOCK',
        description: 'High bass type-C wired earphones with inline control microphone'
      });
      await SupabaseService.addProduct({
        title: 'Hello kitty, Kuromi, Cinnamoroll, Teddy Bear Cute Mouse Pad',
        price: 350,
        category: 'Accessories',
        stock_status: 'IN_STOCK',
        description: 'Cute printed anti-slip cartoon mouse pad featuring Hello Kitty, Kuromi, Cinnamoroll'
      });
      await SupabaseService.addProduct({
        title: 'Cute Cartoon Premium Wireless Bluetooth Earbuds',
        price: 999,
        category: 'Gadgets',
        stock_status: 'IN_STOCK',
        description: 'Cute cartoon design wireless TWS bluetooth earbuds with charging case'
      });
      await SupabaseService.addProduct({
        title: 'Hello Kitty Desk Organiser',
        price: 550,
        category: 'Stationery / Desk Decor',
        stock_status: 'IN_STOCK',
        description: 'Cute Cat Design Plastic Pen Holder & Stationery Desk Organizer',
        images: ['https://shundorproduct.com/products/hello-kitty-desk-organiser']
      });
      await SupabaseService.addProduct({
        title: 'LCD Large Digital Desk Clock',
        price: 650,
        category: 'Gadgets / Desk Decor',
        stock_status: 'IN_STOCK',
        description: 'Large LCD digital display desk clock with alarm, date, calendar and temperature display'
      });
      await SupabaseService.addProduct({
        title: 'Hello kitty Digital Mini Desk Clock',
        price: 450,
        category: 'Gadgets / Desk Decor',
        stock_status: 'IN_STOCK',
        description: 'Cute Hello Kitty cartoon mini digital desk clock with LCD display'
      });
    }
  } catch (err) {
    console.error('Error seeding initial products:', err);
  }
}

// Run initial product check
ensureDefaultProducts();

/**
 * Chat Simulation API Endpoint (POST /api/chat)
 */
apiRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { psid = 'demo_customer_101', text, imageUrl, fileName } = req.body;

    if (!text && !imageUrl) {
      return res.status(400).json({ error: 'Text or imageUrl required' });
    }

    const customer = await SupabaseService.getOrCreateCustomer('default_page_101', psid);
    const products = await SupabaseService.getProducts();

    await SupabaseService.saveMessage(customer.id, 'CUSTOMER', text || '[Sent an Image]', imageUrl);

    let replyText = '';
    let isAlert = false;
    let alertReason: string | undefined = '';

    if (imageUrl) {
      const imgRes = await GeminiService.processImageMatch(imageUrl, products, fileName);
      replyText = imgRes.replyText;
      if (imgRes.matchedProduct) {
        const draftOrder = customer.draft_order || {};
        draftOrder.productTitle = imgRes.matchedProduct.title;
        draftOrder.productPrice = imgRes.matchedProduct.price;
        await SupabaseService.updateCustomer(customer.id, { draft_order: draftOrder });
      }
    } else {
      const result = await OrderStateMachine.handleChatMessage(customer, text, products);
      replyText = result.replyText;
      isAlert = result.isAlert;
      alertReason = result.alertReason;
    }

    if (!customer.is_bot_muted) {
      await SupabaseService.saveMessage(customer.id, 'BOT', replyText);
    }

    const updatedCustomer = await SupabaseService.getOrCreateCustomer('default_page_101', psid);

    res.json({
      replyText,
      customer: updatedCustomer,
      isAlert,
      alertReason
    });
  } catch (err: any) {
    console.error('Chat API Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * Product Management Endpoints
 */
apiRouter.get('/products', async (req: Request, res: Response) => {
  try {
    let products = await SupabaseService.getProducts();
    if (!products || products.length === 0) {
      await ensureDefaultProducts();
      products = await SupabaseService.getProducts();
    }
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/products', async (req: Request, res: Response) => {
  try {
    const newProduct = await SupabaseService.addProduct(req.body);
    res.json(newProduct);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/products/:id/stock', async (req: Request, res: Response) => {
  try {
    const { stockStatus } = req.body;
    const updated = await SupabaseService.updateProductStock(req.params.id, stockStatus);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Order & Customer Management Endpoints
 */
apiRouter.get('/orders', async (req: Request, res: Response) => {
  try {
    const orders = await SupabaseService.getOrders();
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/customers/:id/toggle-bot', async (req: Request, res: Response) => {
  try {
    const { isMuted } = req.body;
    await SupabaseService.updateCustomer(req.params.id, { is_bot_muted: isMuted });
    res.json({ success: true, is_bot_muted: isMuted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
