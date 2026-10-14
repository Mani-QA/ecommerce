import type { QueryClient } from '@tanstack/react-query';
import type { NavigateFunction } from 'react-router-dom';

export interface AgentRuntime {
  navigate: NavigateFunction;
  queryClient: QueryClient;
}
