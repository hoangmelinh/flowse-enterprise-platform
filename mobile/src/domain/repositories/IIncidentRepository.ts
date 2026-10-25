import { Incident, ReportIncidentParams } from '../entities/incident';

export interface IIncidentRepository {
  getAllIncidents(): Promise<Incident[]>;
  getIncidentById(id: number): Promise<Incident>;
  reportIncident(params: ReportIncidentParams): Promise<Incident>;
  triageAndAssign(incidentId: number, assigneeId: number, priority?: string): Promise<Incident>;
  uploadEvidence(photoUri: string): Promise<string>;
}
