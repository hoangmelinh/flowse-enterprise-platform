import { useEffect } from "react";
import { getSocket } from "../services/socket";

export interface RealtimeIncidentPayload {
  incident_id: number;
  task_id: number;
  task_name: string;
  symptom: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  asset_id?: number;
  asset_name?: string;
  state_code?: string;
  state_name?: string;
  state_color?: string;
  reported_at?: string;
  reporter_name?: string;
}

export interface RealtimeTransitionPayload {
  task_id: number;
  incident_id?: number;
  previous_state: string;
  current_state: string;
  current_state_name?: string;
  actor_id?: number;
  actor_name?: string;
  version?: number;
}

interface RealtimeCallbacks {
  onIncidentCreated?: (data: RealtimeIncidentPayload) => void;
  onWorkflowTransitioned?: (data: RealtimeTransitionPayload) => void;
  onNotification?: (data: any) => void;
  onPartsRequested?: (data: any) => void;
  onPartsApproved?: (data: any) => void;
}

/**
 * Hook lắng nghe các sự kiện Realtime Socket.IO chuẩn Proposal
 */
export const useRealtimeEvents = (callbacks: RealtimeCallbacks) => {
  useEffect(() => {
    const socket = getSocket();

    const handleIncidentCreated = (data: RealtimeIncidentPayload) => {
      console.log("[useRealtimeEvents] Nhận INCIDENT_CREATED:", data);
      callbacks.onIncidentCreated?.(data);
    };

    const handleWorkflowTransitioned = (data: RealtimeTransitionPayload) => {
      console.log("[useRealtimeEvents] Nhận WORKFLOW_TRANSITIONED:", data);
      callbacks.onWorkflowTransitioned?.(data);
    };

    const handleNotification = (data: any) => {
      console.log("[useRealtimeEvents] Nhận NOTIFICATION:", data);
      callbacks.onNotification?.(data);
    };

    const handlePartsRequested = (data: any) => {
      console.log("[useRealtimeEvents] Nhận PARTS_REQUESTED:", data);
      callbacks.onPartsRequested?.(data);
    };

    const handlePartsApproved = (data: any) => {
      console.log("[useRealtimeEvents] Nhận PARTS_APPROVED:", data);
      callbacks.onPartsApproved?.(data);
    };

    socket.on("INCIDENT_CREATED", handleIncidentCreated);
    socket.on("WORKFLOW_TRANSITIONED", handleWorkflowTransitioned);
    socket.on("NOTIFICATION_PUSH", handleNotification);
    socket.on("NEW_NOTIFICATION", handleNotification);
    socket.on("PARTS_REQUESTED", handlePartsRequested);
    socket.on("PARTS_APPROVED", handlePartsApproved);

    return () => {
      socket.off("INCIDENT_CREATED", handleIncidentCreated);
      socket.off("WORKFLOW_TRANSITIONED", handleWorkflowTransitioned);
      socket.off("NOTIFICATION_PUSH", handleNotification);
      socket.off("NEW_NOTIFICATION", handleNotification);
      socket.off("PARTS_REQUESTED", handlePartsRequested);
      socket.off("PARTS_APPROVED", handlePartsApproved);
    };
  }, [callbacks]);
};
