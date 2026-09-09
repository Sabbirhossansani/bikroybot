import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env';

export const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

export interface ProductRecord {
  id?: string;
  title: string;
  price: number;
  original_price?: number;
  category?: string;
  stock_status: 'IN_STOCK' | 'OUT_OF_STOCK';
  variants?: any;
  description?: string;
  images?: string[];
}

export interface CustomerRecord {
  id: string;
  page_id: string;
  psid: string;
  name?: string;
  phone?: string;
  address?: string;
  is_bot_muted: boolean;
  order_state: string;
  draft_order: any;
}

export class SupabaseService {
  static async getProducts(): Promise<ProductRecord[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products from Supabase:', error);
      return [];
    }
    return data || [];
  }

  static async addProduct(product: ProductRecord) {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) {
      console.error('Error adding product:', error);
      throw error;
    }
    return data;
  }

  static async updateProductStock(id: string, stockStatus: 'IN_STOCK' | 'OUT_OF_STOCK') {
    const { data, error } = await supabase
      .from('products')
      .update({ stock_status: stockStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating stock status:', error);
      throw error;
    }
    return data;
  }

  static async getOrCreateCustomer(pageId: string, psid: string): Promise<CustomerRecord> {
    const { data: existing } = await supabase
      .from('customers')
      .select('*')
      .eq('page_id', pageId)
      .eq('psid', psid)
      .maybeSingle();

    if (existing) {
      return existing as CustomerRecord;
    }

    const { data: created, error } = await supabase
      .from('customers')
      .insert({
        page_id: pageId,
        psid: psid,
        order_state: 'IDLE',
        draft_order: {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
    return created as CustomerRecord;
  }

  static async updateCustomer(customerId: string, updates: Partial<CustomerRecord>) {
    const { error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', customerId);

    if (error) {
      console.error('Error updating customer:', error);
    }
  }

  static async saveMessage(customerId: string, senderType: 'CUSTOMER' | 'BOT' | 'AGENT', text: string, mediaUrl?: string, mid?: string) {
    const { error } = await supabase
      .from('messages')
      .insert({
        customer_id: customerId,
        sender_type: senderType,
        text,
        media_url: mediaUrl,
        mid: mid
      });

    if (error) {
      console.error('Error saving message:', error);
    }
  }

  static async getMessages(customerId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
    return data || [];
  }

  static async createOrder(orderData: {
    customer_id: string;
    customer_name: string;
    customer_phone: string;
    delivery_address: string;
    delivery_zone: string;
    delivery_fee: number;
    subtotal: number;
    total_amount: number;
    items: any;
  }) {
    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (error) {
      console.error('Error creating order:', error);
      throw error;
    }
    return data;
  }

  static async getOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*, customers(name, phone, psid)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
    return data || [];
  }

  static async updateOrderStatus(id: string, status: string) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
    return data;
  }
}
