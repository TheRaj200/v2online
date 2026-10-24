// Backend / Axios error se user-friendly message nikalta hai
export const getApiErrorMessage = (e: unknown, fallback: string): string => {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message || err?.message || fallback;
};

// Har slice me use hone wala async request status
export type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export const hasToken = () => !!localStorage.getItem('v2online_token');
