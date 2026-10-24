import { store } from '../store';
import { fetchWallet, rechargeWallet as rechargeWalletThunk } from '../store/slices/walletSlice';

export type { WalletTransaction } from '../store/slices/walletSlice';

/**
 * Backward-compatible facade over Redux `wallet` slice.
 * Naye code me `useAppSelector(selectWalletBalance)` + `dispatch(fetchWallet())` use karein.
 */
class WalletStoreService {
  public async syncBackend() {
    await store.dispatch(fetchWallet());
  }

  public subscribe(listener: () => void) {
    return store.subscribe(listener);
  }

  public getBalance(): number {
    return store.getState().wallet.balance;
  }

  public getTransactions() {
    return structuredClone(store.getState().wallet.transactions);
  }

  public isLoading(): boolean {
    return store.getState().wallet.status === 'loading';
  }

  // Recharge Wallet (Add Money)
  public async rechargeWallet(amount: number, remarks?: string): Promise<{ success: boolean; message: string }> {
    const result = await store.dispatch(rechargeWalletThunk({ amount, remarks }));
    if (rechargeWalletThunk.fulfilled.match(result)) return { success: true, message: result.payload };
    return { success: false, message: result.payload || 'Recharge request failed.' };
  }
}

export const walletStore = new WalletStoreService();
