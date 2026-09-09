import { SupabaseService, CustomerRecord } from './supabaseService';
import { GeminiService } from './geminiService';
import { config } from '../config/env';

export class OrderStateMachine {
  /**
   * Helper method to find product with highest word match score
   */
  private static findBestMatchingProduct(textLower: string, productsList: any[]) {
    if (!productsList || productsList.length === 0) return null;

    let bestMatch = null;
    let maxScore = 0;

    const stopWords = new Set(['with', 'holder', 'for', 'and', 'type']);

    for (const product of productsList) {
      const titleWords = product.title.toLowerCase().split(/[\s&,-]+/);
      let score = 0;

      for (const word of titleWords) {
        if (word.length > 2) {
          if (!stopWords.has(word) && textLower.includes(word)) {
            score += 2;
          } else if (stopWords.has(word) && textLower.includes(word)) {
            score += 0.2;
          }
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestMatch = product;
      }
    }

    return maxScore > 0 ? bestMatch : null;
  }

  static async handleChatMessage(
    customer: CustomerRecord,
    messageText: string,
    productsList: any[]
  ): Promise<{ replyText: string; isAlert: boolean; alertReason?: string }> {
    let isAlert = false;
    let alertReason = '';

    if (customer.is_bot_muted) {
      return {
        replyText: '[BOT MUTED] Human agent is handling this conversation.',
        isAlert: false
      };
    }

    let state = customer.order_state || 'IDLE';
    if (state === 'COMPLETED') state = 'IDLE';
    let draftOrder = customer.draft_order || {};
    const textLower = messageText.toLowerCase().trim();

    // Banglish patterns
    const bdPhoneRegex = /(?:01[3-9]\d{8})/;
    const isGreetingIntent = /^(hi|hello|hey|assalamu alaikum|assalamualaykum|salam|slam|hola)$/i.test(textLower);
    const isDiscountIntent = /\b(kom|discount|ডিসকাউন্ট|কম|রাখেন|কমাইন|700|800|600|500|400|300)\b/i.test(textLower) || /kom rakha jabe|discount hobe/i.test(textLower);
    const isCancelIntent = /\b(cancel|cancle|bad|thak|nibo na|না|no|ভুল)\b/i.test(textLower);
    const isExplicitOrder = /\b(order|kinbo|nibo|নিব|কিনব|অর্ডার|chai|চাই|kinte|nithay)\b/i.test(textLower) || /order korte chai|kinte chai|eita nibo|eita kinbo|eita order/i.test(textLower);

    // Global Reset / Cancel Handler
    if (isCancelIntent) {
      await SupabaseService.updateCustomer(customer.id, { order_state: 'IDLE', draft_order: {} });
      return {
        replyText: 'জি ভাইয়া, অর্ডারের প্রসেসটি বাতিল করা হলো। আপনার অন্য কোনো পণ্য সম্পর্কে কিছু জানার থাকলে বলতে পারেন! 😊',
        isAlert: false
      };
    }

    // Direct Greeting Handler with Auto-State Reset
    if (isGreetingIntent) {
      await SupabaseService.updateCustomer(customer.id, { order_state: 'IDLE', draft_order: {} });
      return {
        replyText: 'ওয়ালাইকুম আসসালাম ভাইয়া! Shundor Product এ আপনাকে স্বাগতম। আমাদের কোনো পণ্য সম্পর্কে জানতে বা অর্ডার করতে চান?',
        isAlert: false
      };
    }

    // STATE 1: GATHERING_NAME
    if (state === 'GATHERING_NAME') {
      if (isDiscountIntent) {
        return {
          replyText: 'জি ভাইয়া! আমাদের শপে ফিক্সড প্রাইসে সেল হয়। তবে আমি আমাদের পেজ ওনারকে আপনার ডিসকাউন্টের অনুরোধটি জানিয়েছি। অর্ডারটি বুক করতে আপনার শুভ নামটা লিখুন?',
          isAlert: true,
          alertReason: 'DISCOUNT_REQUESTED'
        };
      }

      const wordCount = messageText.trim().split(/\s+/).length;
      if (wordCount > 4) {
        return {
          replyText: 'ভাইয়া, আপনার পুরো নামটা সংক্ষেপে ১-২ শব্দে লিখুন (যেমন: Rahim Ahmed)?',
          isAlert: false
        };
      }

      draftOrder.name = messageText.trim();
      state = 'GATHERING_PHONE';
      await SupabaseService.updateCustomer(customer.id, {
        order_state: state,
        draft_order: draftOrder,
        name: draftOrder.name
      });

      return {
        replyText: `ধন্যবাদ ${draftOrder.name} ভাইয়া! এবার আপনার ১১ ডিজিটের মোবাইল নম্বরটি দিন (যেমন: 01712345678)?`,
        isAlert: false
      };
    }

    // STATE 2: GATHERING_PHONE
    if (state === 'GATHERING_PHONE') {
      const match = messageText.match(bdPhoneRegex);
      if (match) {
        draftOrder.phone = match[0];
        state = 'GATHERING_ADDRESS';
        await SupabaseService.updateCustomer(customer.id, {
          order_state: state,
          draft_order: draftOrder,
          phone: draftOrder.phone
        });
        return {
          replyText: `আপনার ফোন নম্বরটি পেয়েছি (${draftOrder.phone})। এবার আপনার সম্পূর্ণ ডেলিভারি ঠিকানাটি লিখুন (যেমন: বাসা নম্বর, রোড নম্বর, এলাকা/শহর)?`,
          isAlert: false
        };
      } else if (isDiscountIntent) {
        return {
          replyText: 'জি ভাইয়া! আমাদের শপে ফিক্সড প্রাইসে সেল হয়। তবে আমি আমাদের পেজ ওনারকে আপনার ডিসকাউন্টের অনুরোধটি জানিয়েছি। ওনার কথা বলছেন! আপনার অর্ডার কন্টিনিউ করতে ১১ ডিজিটের ফোন নম্বরটি লিখুন (বা "cancel" লিখুন)?',
          isAlert: true,
          alertReason: 'DISCOUNT_REQUESTED'
        };
      } else {
        return {
          replyText: 'ভাইয়া, মোবাইল নম্বরটি সঠিকভাবে ১১ ডিজিটে দিন (যেমন: 01712345678)? (অর্ডার বাতিল করতে "cancel" লিখুন)',
          isAlert: false
        };
      }
    }

    // STATE 3: GATHERING_ADDRESS
    if (state === 'GATHERING_ADDRESS') {
      draftOrder.address = messageText.trim();
      const isInsideDhaka = /dhaka|ঢাকা/i.test(draftOrder.address);
      const deliveryFee = isInsideDhaka ? config.delivery.dhakaFee : config.delivery.outsideFee;
      const itemPrice = draftOrder.productPrice || 850;
      const total = itemPrice + deliveryFee;

      draftOrder.deliveryFee = deliveryFee;
      draftOrder.deliveryZone = isInsideDhaka ? 'INSIDE_DHAKA' : 'OUTSIDE_DHAKA';
      draftOrder.totalAmount = total;

      state = 'CONFIRMING_ORDER';
      await SupabaseService.updateCustomer(customer.id, {
        order_state: state,
        draft_order: draftOrder,
        address: draftOrder.address
      });

      return {
        replyText: `আপনার অর্ডারের বিবরণ:\n\n📦 প্রোডাক্ট: ${draftOrder.productTitle || 'Rechargeable LED Desk Lamp'}\n💰 দাম: ${itemPrice} TK\n🚚 ডেলিভারি চার্জ (${isInsideDhaka ? 'ঢাকার ভেতরে' : 'ঢাকার বাইরে'}): ${deliveryFee} TK\n💵 মোট সর্বমোট: ${total} TK\n\nনাম: ${draftOrder.name}\nফোন: ${draftOrder.phone}\nঠিকানা: ${draftOrder.address}\n\nঅর্ডারটি কনফার্ম করতে "Confirm" বা "হ্যাঁ" লিখুন!`,
        isAlert: false
      };
    }

    // STATE 4: CONFIRMING_ORDER
    if (state === 'CONFIRMING_ORDER') {
      const isConfirmed = /\b(confirm|yes|ha|hae|জি|হ্যাঁ|ঠিক|ok)\b/i.test(textLower);
      if (isConfirmed) {
        await SupabaseService.createOrder({
          customer_id: customer.id,
          customer_name: draftOrder.name || customer.name || 'Valued Customer',
          customer_phone: draftOrder.phone || customer.phone || '01700000000',
          delivery_address: draftOrder.address || customer.address || 'Dhaka',
          delivery_zone: draftOrder.deliveryZone || 'INSIDE_DHAKA',
          delivery_fee: draftOrder.deliveryFee || config.delivery.dhakaFee,
          subtotal: draftOrder.productPrice || 850,
          total_amount: draftOrder.totalAmount || 930,
          items: [{ title: draftOrder.productTitle || 'Rechargeable LED Desk Lamp', price: draftOrder.productPrice || 850, qty: 1 }]
        });

        await SupabaseService.updateCustomer(customer.id, {
          order_state: 'IDLE',
          draft_order: {}
        });

        return {
          replyText: `🎉 অভিনন্দন ${draftOrder.name || ''}! আপনার অর্ডারটি সফলভাবে বুক করা হয়েছে। আমরা ডেলিভারির আগে ফোন করে আপনাকে কনফার্ম করব। Shundor Product এর সাথে থাকার জন্য ধন্যবাদ!`,
          isAlert: true,
          alertReason: 'NEW_ORDER_CREATED'
        };
      }
    }

    // Check Discount Intent
    if (isDiscountIntent) {
      return {
        replyText: 'জি ভাইয়া! আমাদের শপে ফিক্সড প্রাইসে সেল হয়। তবে আমি আমাদের পেজ ওনারকে আপনার ডিসকাউন্টের অনুরোধটি জানিয়েছি। ওনার কিছুক্ষণের মধ্যে আপনাকে দাম কম রাখা যাবে কি না জানিয়ে দিচ্ছেন! 😊',
        isAlert: true,
        alertReason: 'DISCOUNT_REQUESTED'
      };
    }

    // Update customer's product context memory based on highest matching score
    const bestMatchedProduct = this.findBestMatchingProduct(textLower, productsList);
    if (bestMatchedProduct) {
      draftOrder.productTitle = bestMatchedProduct.title;
      draftOrder.productPrice = bestMatchedProduct.price;
      await SupabaseService.updateCustomer(customer.id, { draft_order: draftOrder });
    }

    // Detect if customer asks to order when in IDLE state
    if (state === 'IDLE' && isExplicitOrder) {
      state = 'GATHERING_NAME';

      await SupabaseService.updateCustomer(customer.id, {
        order_state: state,
        draft_order: draftOrder
      });

      return {
        replyText: `জি ভাইয়া! ${draftOrder.productTitle || 'প্রোডাক্ট'} এর অর্ডারটি প্লেস করতে আপনার সম্পূর্ণ নামটা লিখুন?`,
        isAlert: false
      };
    }

    // Default Gemini NLU Processing
    const aiResp = await GeminiService.processChat(messageText, productsList, state);

    return {
      replyText: aiResp.replyText,
      isAlert,
      alertReason
    };
  }
}
