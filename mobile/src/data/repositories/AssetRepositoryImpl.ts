import { IAssetRepository } from '../../domain/repositories/IAssetRepository';
import { Asset, AssetContext } from '../../domain/entities/asset';
import apiClient from '../api/apiClient';

export class AssetRepositoryImpl implements IAssetRepository {
  async getAllAssets(): Promise<Asset[]> {
    const res = await apiClient.get('/assets');
    return (res.data || []).map((a: any) => this.mapToAsset(a));
  }

  async getAssetById(id: number): Promise<Asset> {
    const res = await apiClient.get(`/assets/${id}`);
    return this.mapToAsset(res.data);
  }

  async resolveQrToken(qrToken: string): Promise<AssetContext> {
    const res = await apiClient.get(`/assets/resolve?token=${encodeURIComponent(qrToken)}`);
    const data = res.data;

    return {
      asset: this.mapToAsset(data.asset),
      activeIncidents: (data.active_incidents || []).map((inc: any) => ({
        id: inc.incident_id,
        taskId: inc.task_id,
        title: inc.task_name,
        severity: inc.severity,
        stateName: inc.state_name || 'Đang xử lý',
        stateColor: inc.state_color || '#EF4444',
        reporterName: inc.reporter_name || 'N/A',
      })),
      availableChecklists: (data.available_checklists || []).map((chk: any) => ({
        id: chk.checklist_id,
        title: chk.title,
        itemCount: chk.item_count || 0,
      })),
    };
  }

  private mapToAsset(a: any): Asset {
    return {
      id: a.asset_id,
      assetCode: a.asset_code,
      name: a.name,
      location: a.location,
      departmentId: a.department_id,
      departmentName: a.department_name,
      qrToken: a.qr_token,
      status: a.status || 'OPERATIONAL',
      specs: typeof a.specs === 'object' ? a.specs : {},
      incidentCount: a.incident_count ? parseInt(a.incident_count, 10) : 0,
      createdAt: a.created_at,
    };
  }
}
