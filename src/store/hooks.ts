import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './index';

// Typed Redux hooks — pages me hamesha inhi ko use karein
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

// Common selectors
export const selectAuthUser = (s: RootState) => s.auth.user;
export const selectWalletBalance = (s: RootState) => s.wallet.balance;
export const selectWalletTransactions = (s: RootState) => s.wallet.transactions;
export const selectWalletStatus = (s: RootState) => s.wallet.status;
export const selectComplaints = (s: RootState) => s.complaints.items;
export const selectComplaintsStatus = (s: RootState) => s.complaints.status;
export const selectShops = (s: RootState) => s.shops.items;
export const selectShopsStatus = (s: RootState) => s.shops.status;
export const selectServices = (s: RootState) => s.services.items;
export const selectServicesStatus = (s: RootState) => s.services.status;

// Skeleton dikhana hai ya nahi: pehli baar load ho raha ho (data abhi tak nahi aaya)
export const isInitialLoading = (status: string, itemCount: number) =>
  (status === 'idle' || status === 'loading') && itemCount === 0;
