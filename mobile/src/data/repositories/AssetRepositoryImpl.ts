import { IAssetRepository } from '../../domain/repositories/IAssetRepository';
import { Asset, AssetContext, AssetInsight, AssetRecord } from '../../domain/entities/asset';
import apiClient from '../api/apiClient';

export class AssetRepositoryImpl implements IAssetRepository {
  async getAllAssets(): Promise<Asset[]> {
    const res = await apiClient.get('/assets');
    return (res.data?.data || []).map((a: any) => this.mapToAsset(a));
  }

  async getAssetById(id: number): Promise<Asset> {
    const res = await apiClient.get(`/assets/${id}`);
    return this.mapToAsset(res.data?.data);
  }

  resolveQrToken(qrToken: string): Promise<AssetContext> {
    return this.resolve({ token: qrToken });
  }

  async resolve(query: { token?: string; code?: string }): Promise<AssetContext> {
    // backend trả { success, data: { asset, active_incidents, available_checklists } }
    const res = await apiClient.get('/assets/resolve', { params: query });
    const data = res.data?.data || {};

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

  async getRecord(assetId: number): Promise<AssetRecord> {
    const res = await apiClient.get(`/assets/${assetId}/health-record`);
    const d = res.data?.data || {};
    return {
      asset: this.mapToAsset(d.asset),
      repairs: (d.timeline || [])
        .filter((e: any) => e.type === 'INCIDENT')
        .map((e: any) => ({
          id: e.id,
          title: e.title,
          symptom: e.subtitle || undefined,
          rootCause: e.root_cause || undefined,
          resolution: e.resolution || undefined,
          fixer: e.fixer || undefined,
          occurredAt: e.occurred_at || undefined,
          resolvedAt: e.resolved_at || undefined,
          open: e.status !== 'RESOLVED',
          downtimeMinutes: e.downtime_minutes ?? undefined,
        })),
    };
  }

  async explain(assetId: number, symptom = ''): Promise<AssetInsight> {
    const res = await apiClient.post(`/assets/${assetId}/ai-insight`, { symptom });
    const d = res.data?.data || {};
    return {
      summary: d.summary || '',
      likelyCauses: (d.likely_causes || []).map((c: any) => ({ cause: c.cause, incidentIds: c.incident_ids || [] })),
      steps: d.steps || [],
      insufficientData: d.insufficient_data === true,
      safetyNote: d.safety_note || '',
    };
  }

  private mapToAsset(a: any): Asset {
    a = a || {};
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
