import { IIncidentRepository } from '../../domain/repositories/IIncidentRepository';
import { Incident, ReportIncidentParams } from '../../domain/entities/incident';
import apiClient from '../api/apiClient';

export class IncidentRepositoryImpl implements IIncidentRepository {
  async getAllIncidents(): Promise<Incident[]> {
    const res = await apiClient.get('/incidents');
    return (res.data || []).map((inc: any) => this.mapToIncident(inc));
  }

  async getIncidentById(id: number): Promise<Incident> {
    const res = await apiClient.get(`/incidents/${id}`);
    return this.mapToIncident(res.data);
  }

  async reportIncident(params: ReportIncidentParams): Promise<Incident> {
    const payload = {
      title: params.title,
      symptom: params.symptom,
      asset_id: params.assetId,
      severity: params.severity,
      evidence_urls: params.evidencePhotos,
      list_id: params.listId,
    };
    const res = await apiClient.post('/incidents', payload);
    return this.mapToIncident(res.data?.incident || res.data);
  }

  async triageAndAssign(incidentId: number, assigneeId: number, priority?: string): Promise<Incident> {
    const res = await apiClient.post(`/incidents/${incidentId}/assign`, {
      assignee_id: assigneeId,
      priority,
    });
    return this.mapToIncident(res.data?.incident || res.data);
  }

  async uploadEvidence(photoUri: string): Promise<string> {
    const formData = new FormData();
    const filename = photoUri.split('/').pop() || 'evidence.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: photoUri,
      name: filename,
      type,
    } as any);

    const res = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return res.data?.url || res.data?.fileUrl || photoUri;
  }

  private mapToIncident(inc: any): Incident {
    return {
      id: inc.incident_id,
      taskId: inc.task_id,
      assetId: inc.asset_id,
      assetCode: inc.asset_code,
      assetName: inc.asset_name,
      assetLocation: inc.asset_location,
      reporterId: inc.reported_by,
      reporterName: inc.reporter_name,
      reporterAvatar: inc.reporter_avatar,
      severity: inc.severity || 'MEDIUM',
      symptom: inc.symptom || '',
      evidenceUrls: Array.isArray(inc.evidence_urls) ? inc.evidence_urls : [],
      verifiedBy: inc.verified_by,
      verifierName: inc.verifier_name,
      verifiedAt: inc.verified_at,
      createdAt: inc.created_at,
    };
  }
}
