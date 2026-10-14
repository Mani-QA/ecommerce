import { useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import type { AgentRuntime } from './runtime';
import { useAdminTools, useCustomerTools } from './useAgentTools';

export const customerToolNames = [
  'search_products',
  'get_product',
  'get_cart',
  'add_to_cart',
  'set_cart_quantity',
  'clear_cart',
  'get_session',
  'sign_in',
  'sign_out',
  'create_account',
  'list_orders',
  'get_order',
  'place_order',
  'open_page',
] as const;

export const adminToolNames = ['get_store_stats', 'update_stock', 'update_order_status'] as const;

export default function StoreAgentTools() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((state) => state.isAuthenticated && state.user?.userType === 'admin');
  const runtime = useRef<AgentRuntime>({ navigate, queryClient });
  runtime.current = { navigate, queryClient };

  useCustomerTools(runtime);
  useAdminTools(runtime, isAdmin);
  return null;
}
