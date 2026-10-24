import apiClient from '../api/client';
import { store } from '../store';
import {
  fetchServices,
  createService,
  updateService as updateServiceThunk,
  toggleService as toggleServiceThunk,
  deleteService as deleteServiceThunk
} from '../store/slices/servicesSlice';
import type { ServiceItem } from '../types/service';
import { getApiErrorMessage } from '../store/apiError';

export * from '../types/service';

/**
 * Backward-compatible facade over Redux `services` slice.
 * Getters deep copy dete hain (Redux state frozen hai, edit forms ise mutate karte hain).
 * Mutations server failure par error throw karti hain — fake local success nahi.
 */
class ServiceStoreService {
  public async syncBackend() {
    await store.dispatch(fetchServices());
  }

  public subscribe(listener: () => void) {
    return store.subscribe(listener);
  }

  public isLoading(): boolean {
    return store.getState().services.status === 'loading';
  }

  public getServices(): ServiceItem[] {
    return structuredClone(store.getState().services.items);
  }

  public getActiveServices(): ServiceItem[] {
    return this.getServices().filter(s => s.isActive);
  }

  public getServiceById(id: string): ServiceItem | undefined {
    return this.getServices().find(s => s.id === id);
  }

  // Upload Icon Image to Server (fail hone par error — base64 fallback DB me save nahi hota)
  public async uploadIcon(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('icon', file);
      const response = await apiClient.post('/services/upload-icon', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.status === 'success' && response.data.url) return response.data.url;
      throw new Error(response.data.message || 'Icon upload failed.');
    } catch (e) {
      throw new Error(getApiErrorMessage(e, 'Icon upload failed.'));
    }
  }

  public async addService(data: Omit<ServiceItem, 'id' | 'createdAt'>): Promise<ServiceItem> {
    const result = await store.dispatch(createService(data));
    if (!createService.fulfilled.match(result)) throw new Error(result.payload || 'Failed to create service.');
    return { ...data, id: result.payload, createdAt: new Date().toISOString() };
  }

  public async updateService(id: string, data: Partial<ServiceItem>): Promise<boolean> {
    const result = await store.dispatch(updateServiceThunk({ id, data }));
    if (!updateServiceThunk.fulfilled.match(result)) throw new Error(result.payload || 'Failed to update service.');
    return true;
  }

  public async toggleService(id: string): Promise<boolean> {
    const result = await store.dispatch(toggleServiceThunk(id));
    if (!toggleServiceThunk.fulfilled.match(result)) throw new Error(result.payload || 'Failed to change service status.');
    return true;
  }

  public async deleteService(id: string): Promise<boolean> {
    const result = await store.dispatch(deleteServiceThunk(id));
    if (!deleteServiceThunk.fulfilled.match(result)) throw new Error(result.payload || 'Failed to delete service.');
    return true;
  }
}

export const serviceStore = new ServiceStoreService();
export default serviceStore;
