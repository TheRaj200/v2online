import { store } from '../store';
import {
  fetchShops,
  addShop,
  approveShop as approveShopThunk,
  rejectShop as rejectShopThunk,
  requestShopDeletion,
  approveShopDeletion,
  deleteShopPermanentlyThunk,
  type Shop,
  type NewShopInput
} from '../store/slices/shopsSlice';

export type { Shop } from '../store/slices/shopsSlice';

// Thunk reject hone par error throw karta hai taaki page user ko sahi reason dikha sake
const unwrapOrThrow = async (promise: Promise<any>, fallback: string) => {
  const result = await promise;
  if (result.error) throw new Error(result.payload || fallback);
  return result.payload;
};

/**
 * Backward-compatible facade over Redux `shops` slice.
 * Naye code me `useAppSelector(selectShops)` + thunks use karein.
 */
class ShopStoreService {
  public async syncBackend() {
    await store.dispatch(fetchShops());
  }

  public subscribe(listener: () => void) {
    return store.subscribe(listener);
  }

  public isLoading(): boolean {
    return store.getState().shops.status === 'loading';
  }

  public getShops(): Shop[] {
    return structuredClone(store.getState().shops.items);
  }

  // Distributor / Admin Add New Shop -> ACTIVE
  public async addActiveShopByDistributor(data: NewShopInput): Promise<Shop> {
    return unwrapOrThrow(store.dispatch(addShop(data)), 'Failed to create shop on server.');
  }

  public async approveShop(shopId: string) {
    await unwrapOrThrow(store.dispatch(approveShopThunk({ shopId })), 'Failed to approve shop.');
  }

  public async rejectShop(shopId: string) {
    await unwrapOrThrow(store.dispatch(rejectShopThunk({ shopId })), 'Failed to reject shop.');
  }

  public async requestDeletion(shopId: string, reason: string) {
    await unwrapOrThrow(store.dispatch(requestShopDeletion({ shopId, reason })), 'Failed to submit deletion request.');
  }

  public async approveDeletion(shopId: string) {
    await unwrapOrThrow(store.dispatch(approveShopDeletion({ shopId })), 'Failed to approve deletion.');
  }

  public async deleteShopPermanently(shopId: string) {
    await unwrapOrThrow(store.dispatch(deleteShopPermanentlyThunk({ shopId })), 'Failed to delete shop.');
  }
}

export const shopStore = new ShopStoreService();
