import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,
  meta: {
    verifyToken: process.env.META_VERIFY_TOKEN || 'lazychat_secret_verify_token_123',
    appSecret: process.env.META_APP_SECRET || '',
    pageAccessToken: process.env.META_PAGE_ACCESS_TOKEN || ''
  },
  gemini: {
    get apiKey() {
      dotenv.config();
      return process.env.GEMINI_API_KEY || '';
    }
  },
  supabase: {
    url: process.env.SUPABASE_URL || 'https://xekykeupmbbopvupofpt.supabase.co',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  },
  delivery: {
    dhakaFee: Number(process.env.DELIVERY_FEE_DHAKA) || 80,
    outsideFee: Number(process.env.DELIVERY_FEE_OUTSIDE) || 150
  }
};
