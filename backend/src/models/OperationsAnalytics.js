import con from "../config/connect.js";
import Department from "./Department.js";
import { AppError } from "../middlewares/errorMiddleware.js";

const VALID_PERIODS = ["today", "week", "month", "all"];
const VALID_SCOPES = ["all", "office", "industrial"];

function getPeriodStartExpr(period) {
  switch (period) {
    case "today":
      return "DATE_TRUNC('day', CURRENT_TIMESTAMP)";
    case "week":
      return "DATE_TRUNC('week', CURRENT_TIMESTAMP)";
    case "month":
      return "DATE_TRUNC('month', CURRENT_TIMESTAMP)";
    default:
      return null;
  }
}

class OperationsAnalytics {
  /**
   * Tổng hợp chỉ số vận hành doanh nghiệp theo 3 phạm vi (all | office | industrial),
   * cô lập tuyệt đối theo Workspace và Department Scope của người dùng.
   */
  static async getWorkspaceOverview({
    workspaceId,
    userId,
    userRole,
    period = "month",
    scope = "all",
    departmentId = null,
  }) {
    const safePeriod = VALID_PERIODS.includes(period) ? period : "month";
    const safeScope = VALID_SCOPES.includes(scope) ? scope : "all";
    const wsId = Number(workspaceId);

    const accessibleDeptIds = await Department.getAccessibleDepartmentIds(userId, userRole, wsId);

    let filterDeptIds = null;
    if (departmentId !== null && departmentId !== undefined && departmentId !== "") {
      const targetDeptId = Number(departmentId);
      if (!Number.isInteger(targetDeptId) || targetDeptId <= 0) {
        throw new AppError("departmentId không hợp lệ.", 400, "INVALID_DEPARTMENT_ID");
      }
      const dept = await Department.getById(targetDeptId);
      if (!dept || Number(dept.workspace_id) !== wsId) {
        throw new AppError("Phòng ban không thuộc Workspace này.", 403, "FORBIDDEN");
      }
      if (accessibleDeptIds !== null && !accessibleDeptIds.includes(targetDeptId)) {
        throw new AppError("Bạn không có quyền xem số liệu của phòng ban ngoài phạm vi quản lý.", 403, "FORBIDDEN");
      }
      filterDeptIds = [targetDeptId];
    } else if (accessibleDeptIds !== null) {
      filterDeptIds = accessibleDeptIds;
    }

    const periodStartSql = getPeriodStartExpr(safePeriod);
    const taskDeptClause = filterDeptIds !== null ? `AND t.department_id = ANY($2::int[])` : "";
    const baseTaskParams = filterDeptIds !== null ? [wsId, filterDeptIds] : [wsId];

    // 1. Work items stock + period flow (using LATERAL sla_instances to prevent 1:N row multiplication)
    const createdCond = periodStartSql ? `t.created_at >= ${periodStartSql}` : "TRUE";
    const completedCond = periodStartSql
      ? `COALESCE(t.completed_at, t.updated_at) >= ${periodStartSql}`
      : "TRUE";

    const workItemsQuery = `
      SELECT
        COALESCE(t.work_item_type, 'TASK') AS work_item_type,
        COUNT(*) FILTER (WHERE COALESCE(ws.is_terminal, false) = false)::int AS open_count,
        COUNT(*) FILTER (
          WHERE COALESCE(ws.is_terminal, false) = false
            AND (
              (t.due_date IS NOT NULL AND t.due_date < CURRENT_TIMESTAMP)
              OR si.status = 'BREACHED'
            )
        )::int AS overdue_count,
        COUNT(*) FILTER (WHERE ${createdCond})::int AS created_in_period,
        COUNT(*) FILTER (
          WHERE COALESCE(ws.is_terminal, false) = true AND ${completedCond}
        )::int AS completed_in_period,
        COUNT(*) FILTER (
          WHERE COALESCE(ws.is_terminal, false) = true
            AND ${completedCond}
            AND t.due_date IS NOT NULL
        )::int AS completed_with_due_date,
        COUNT(*) FILTER (
          WHERE COALESCE(ws.is_terminal, false) = true
            AND ${completedCond}
            AND t.due_date IS NOT NULL
            AND COALESCE(t.completed_at, t.updated_at) <= t.due_date
        )::int AS completed_on_time,
        COUNT(*) FILTER (WHERE si.status = 'COMPLETED' AND si.breached_at IS NULL AND ${createdCond})::int AS sla_met_count,
        COUNT(*) FILTER (WHERE (si.status = 'BREACHED' OR si.breached_at IS NOT NULL) AND ${createdCond})::int AS sla_breached_count,
        COUNT(*) FILTER (WHERE si.status = 'AT_RISK' AND COALESCE(ws.is_terminal, false) = false)::int AS sla_at_risk_count,
        COUNT(*) FILTER (WHERE si.status = 'IN_SLA' AND COALESCE(ws.is_terminal, false) = false)::int AS sla_in_sla_count
      FROM tasks t
      JOIN lists l ON l.list_id = t.list_id AND l.deleted_at IS NULL
      JOIN spaces sp ON sp.space_id = l.space_id AND sp.deleted_at IS NULL
      LEFT JOIN workflow_states ws ON ws.state_id = t.current_state_id
      LEFT JOIN LATERAL (
        SELECT status, deadline_at, breached_at
        FROM sla_instances
        WHERE task_id = t.task_id
        ORDER BY sla_instance_id DESC
        LIMIT 1
      ) si ON TRUE
      WHERE sp.workspace_id = $1
        AND t.deleted_at IS NULL
        ${taskDeptClause}
      GROUP BY COALESCE(t.work_item_type, 'TASK')
    `;

    // 2. Pending approvals separated explicitly by office vs maintenance/incident
    const approvalDeptClause =
      filterDeptIds !== null
        ? `AND (t.department_id = ANY($2::int[]) OR ast.department_id = ANY($2::int[]))`
        : "";
    const approvalsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE a.incident_id IS NULL AND COALESCE(t.work_item_type, 'TASK') IN ('TASK', 'REQUEST'))::int AS pending_office,
        COUNT(*) FILTER (WHERE a.incident_id IS NOT NULL OR t.work_item_type = 'INCIDENT')::int AS pending_industrial,
        COUNT(*)::int AS pending_total
      FROM approvals a
      JOIN tasks t ON t.task_id = a.task_id AND t.deleted_at IS NULL
      JOIN lists l ON l.list_id = t.list_id
      JOIN spaces sp ON sp.space_id = l.space_id
      LEFT JOIN incidents inc ON inc.incident_id = a.incident_id
      LEFT JOIN assets ast ON ast.asset_id = inc.asset_id
      WHERE sp.workspace_id = $1
        AND a.status = 'PENDING'
        ${approvalDeptClause}
    `;

    // 3. Assets status breakdown (only when scope is all or industrial)
    const assetDeptClause = filterDeptIds !== null ? `AND a.department_id = ANY($2::int[])` : "";
    const assetsQuery = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE a.status = 'OPERATIONAL')::int AS operational,
        COUNT(*) FILTER (WHERE a.status = 'MAINTENANCE')::int AS maintenance,
        COUNT(*) FILTER (WHERE a.status = 'FAULTY')::int AS faulty,
        COUNT(*) FILTER (WHERE a.status = 'DECOMMISSIONED')::int AS decommissioned
      FROM assets a
      WHERE a.workspace_id = $1
        ${assetDeptClause}
    `;

    // 4. Incidents & elapsed resolution time (strictly scoped to workspace + department)
    const incPeriodCond = periodStartSql ? `AND inc.created_at >= ${periodStartSql}` : "";
    const incDeptClause =
      filterDeptIds !== null ? `AND (a.department_id = ANY($2::int[]) OR t.department_id = ANY($2::int[]))` : "";
    const incidentsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE COALESCE(ws.is_terminal, false) = false)::int AS open_total,
        COUNT(*) FILTER (WHERE COALESCE(ws.is_terminal, false) = false AND inc.severity = 'CRITICAL')::int AS open_critical,
        COUNT(*) FILTER (WHERE COALESCE(ws.is_terminal, false) = false AND inc.severity = 'HIGH')::int AS open_high,
        COUNT(*) FILTER (WHERE TRUE ${incPeriodCond})::int AS total_in_period,
        COUNT(*) FILTER (WHERE inc.resolved_at IS NOT NULL ${incPeriodCond})::int AS resolved_in_period,
        COALESCE(SUM(CASE WHEN inc.resolved_at IS NOT NULL ${incPeriodCond} THEN inc.downtime_minutes ELSE 0 END), 0)::int AS total_elapsed_minutes,
        ROUND(AVG(CASE WHEN inc.resolved_at IS NOT NULL ${incPeriodCond} THEN inc.downtime_minutes END))::int AS avg_elapsed_minutes
      FROM incidents inc
      JOIN tasks t ON t.task_id = inc.task_id AND t.deleted_at IS NULL
      JOIN lists l ON l.list_id = t.list_id
      JOIN spaces sp ON sp.space_id = l.space_id
      LEFT JOIN workflow_states ws ON ws.state_id = t.current_state_id
      LEFT JOIN assets a ON a.asset_id = inc.asset_id
      WHERE sp.workspace_id = $1
        ${incDeptClause}
    `;

    const topAssetsQuery = `
      SELECT
        a.asset_id,
        a.asset_code,
        a.name AS asset_name,
        a.location,
        a.status,
        COUNT(inc.incident_id)::int AS incident_count,
        COALESCE(SUM(inc.downtime_minutes), 0)::int AS total_elapsed_minutes
      FROM assets a
      JOIN incidents inc ON inc.asset_id = a.asset_id
      JOIN tasks t ON t.task_id = inc.task_id AND t.deleted_at IS NULL
      JOIN lists l ON l.list_id = t.list_id
      JOIN spaces sp ON sp.space_id = l.space_id
      WHERE sp.workspace_id = $1
        AND a.workspace_id = $1
        AND inc.resolved_at IS NOT NULL
        ${incPeriodCond}
        ${assetDeptClause}
      GROUP BY a.asset_id, a.asset_code, a.name, a.location, a.status
      ORDER BY total_elapsed_minutes DESC, incident_count DESC
      LIMIT 5
    `;

    // 5. Inspection runs within workspace
    const inspPeriodCond = periodStartSql ? `AND COALESCE(ir.completed_at, ir.started_at) >= ${periodStartSql}` : "";
    const inspectionsQuery = `
      SELECT
        COUNT(*)::int AS total_runs,
        COUNT(*) FILTER (WHERE ir.overall_status = 'PASS')::int AS pass_count,
        COUNT(*) FILTER (WHERE ir.overall_status = 'FAIL')::int AS fail_count
      FROM inspection_runs ir
      JOIN checklists c ON c.checklist_id = ir.checklist_id
      JOIN assets a ON a.asset_id = c.asset_id
      WHERE a.workspace_id = $1
        ${inspPeriodCond}
        ${assetDeptClause}
    `;

    // 6. Department breakdown (orthogonal — keeps work item streams distinct per department)
    const deptFilterClause = filterDeptIds !== null ? `AND d.department_id = ANY($2::int[])` : "";
    const departmentsQuery = `
      SELECT
        d.department_id,
        d.code,
        d.name,
        d.parent_id,
        u.name AS manager_name,
        (
          SELECT COUNT(*)::int FROM users usr
          JOIN workspace_members wm ON wm.user_id = usr.user_id AND wm.workspace_id = $1 AND wm.deleted_at IS NULL
          WHERE usr.department_id = d.department_id AND usr.deleted_at IS NULL AND COALESCE(usr.is_active, true) = true
        ) AS active_members,
        (
          SELECT COUNT(*)::int FROM tasks t
          JOIN lists l ON l.list_id = t.list_id
          JOIN spaces sp ON sp.space_id = l.space_id
          LEFT JOIN workflow_states ws ON ws.state_id = t.current_state_id
          WHERE sp.workspace_id = $1 AND t.deleted_at IS NULL AND t.department_id = d.department_id
            AND COALESCE(t.work_item_type, 'TASK') = 'TASK' AND COALESCE(ws.is_terminal, false) = false
        ) AS open_tasks,
        (
          SELECT COUNT(*)::int FROM tasks t
          JOIN lists l ON l.list_id = t.list_id
          JOIN spaces sp ON sp.space_id = l.space_id
          LEFT JOIN workflow_states ws ON ws.state_id = t.current_state_id
          WHERE sp.workspace_id = $1 AND t.deleted_at IS NULL AND t.department_id = d.department_id
            AND t.work_item_type = 'REQUEST' AND COALESCE(ws.is_terminal, false) = false
        ) AS open_requests,
        (
          SELECT COUNT(*)::int FROM tasks t
          JOIN lists l ON l.list_id = t.list_id
          JOIN spaces sp ON sp.space_id = l.space_id
          LEFT JOIN workflow_states ws ON ws.state_id = t.current_state_id
          WHERE sp.workspace_id = $1 AND t.deleted_at IS NULL AND t.department_id = d.department_id
            AND t.work_item_type = 'INCIDENT' AND COALESCE(ws.is_terminal, false) = false
        ) AS open_incidents,
        (
          SELECT COUNT(*)::int FROM assets a
          WHERE a.workspace_id = $1 AND a.department_id = d.department_id
        ) AS asset_count
      FROM departments d
      LEFT JOIN users u ON u.user_id = d.manager_id
      WHERE d.workspace_id = $1
        ${deptFilterClause}
      ORDER BY d.department_id ASC
    `;

    const [wiRes, appRes, deptRes, assetsRes, incRes, topAssetsRes, inspRes] = await Promise.all([
      con.query(workItemsQuery, baseTaskParams),
      con.query(approvalsQuery, baseTaskParams),
      con.query(departmentsQuery, baseTaskParams),
      safeScope !== "office" ? con.query(assetsQuery, baseTaskParams) : Promise.resolve(null),
      safeScope !== "office" ? con.query(incidentsQuery, baseTaskParams) : Promise.resolve(null),
      safeScope !== "office" ? con.query(topAssetsQuery, baseTaskParams) : Promise.resolve(null),
      safeScope !== "office" ? con.query(inspectionsQuery, baseTaskParams) : Promise.resolve(null),
    ]);

    const byType = new Map();
    for (const row of wiRes.rows) {
      byType.set(row.work_item_type, row);
    }
    const pick = (type) =>
      byType.get(type) || {
        open_count: 0,
        overdue_count: 0,
        created_in_period: 0,
        completed_in_period: 0,
        completed_with_due_date: 0,
        completed_on_time: 0,
        sla_met_count: 0,
        sla_breached_count: 0,
        sla_at_risk_count: 0,
        sla_in_sla_count: 0,
      };

    const taskRow = pick("TASK");
    const reqRow = pick("REQUEST");
    const incTypeRow = pick("INCIDENT");
    const inspTypeRow = pick("INSPECTION");
    const appRow = appRes.rows[0] || { pending_office: 0, pending_industrial: 0, pending_total: 0 };

    const computeSlaRate = (rows) => {
      const met = rows.reduce((s, r) => s + (r.sla_met_count || 0), 0);
      const breached = rows.reduce((s, r) => s + (r.sla_breached_count || 0), 0);
      const atRisk = rows.reduce((s, r) => s + (r.sla_at_risk_count || 0), 0);
      const inSla = rows.reduce((s, r) => s + (r.sla_in_sla_count || 0), 0);
      const denom = met + breached;
      return {
        metCount: met,
        breachedCount: breached,
        atRiskCount: atRisk,
        inSlaCount: inSla,
        complianceRate: denom > 0 ? Math.round((met / denom) * 100) : null,
      };
    };

    const officeRows = [taskRow, reqRow];
    const officeWithDue = taskRow.completed_with_due_date + reqRow.completed_with_due_date;
    const officeOnTime = taskRow.completed_on_time + reqRow.completed_on_time;

    const officeMetrics =
      safeScope === "all" || safeScope === "office"
        ? {
            openTasks: taskRow.open_count,
            overdueTasks: taskRow.overdue_count,
            openRequests: reqRow.open_count,
            overdueRequests: reqRow.overdue_count,
            createdInPeriod: taskRow.created_in_period + reqRow.created_in_period,
            completedInPeriod: taskRow.completed_in_period + reqRow.completed_in_period,
            completedOnTimeInPeriod: officeOnTime,
            completedWithDueDateInPeriod: officeWithDue,
            onTimeRate: officeWithDue > 0 ? Math.round((officeOnTime / officeWithDue) * 100) : null,
            pendingApprovals: appRow.pending_office,
            sla: computeSlaRate(officeRows),
          }
        : null;

    let industrialMetrics = null;
    if (safeScope === "all" || safeScope === "industrial") {
      const aRow = assetsRes?.rows[0] || { total: 0, operational: 0, maintenance: 0, faulty: 0, decommissioned: 0 };
      const iRow = incRes?.rows[0] || {
        open_total: 0,
        open_critical: 0,
        open_high: 0,
        total_in_period: 0,
        resolved_in_period: 0,
        total_elapsed_minutes: 0,
        avg_elapsed_minutes: null,
      };
      const insRow = inspRes?.rows[0] || { total_runs: 0, pass_count: 0, fail_count: 0 };
      const inspDenom = insRow.pass_count + insRow.fail_count;

      industrialMetrics = {
        assetsByStatus: {
          total: aRow.total,
          OPERATIONAL: aRow.operational,
          MAINTENANCE: aRow.maintenance,
          FAULTY: aRow.faulty,
          DECOMMISSIONED: aRow.decommissioned,
        },
        incidents: {
          openTotal: iRow.open_total,
          openCritical: iRow.open_critical,
          openHigh: iRow.open_high,
          totalInPeriod: iRow.total_in_period,
          resolvedInPeriod: iRow.resolved_in_period,
        },
        pendingMaintenanceApprovals: appRow.pending_industrial,
        downtime: {
          totalElapsedMinutes: iRow.total_elapsed_minutes || 0,
          avgElapsedResolutionMinutes: iRow.resolved_in_period > 0 ? iRow.avg_elapsed_minutes : null,
          repairDurationAvailable: false,
          repairDurationReason:
            "DB ghi nhận tổng thời gian từ lúc mở đến khi đóng sự cố (resolved_at - created_at), chưa tách riêng thời gian sửa chữa trực tiếp trên thiết bị.",
        },
        inspections: {
          totalRunsInPeriod: insRow.total_runs,
          passCount: insRow.pass_count,
          failCount: insRow.fail_count,
          passRate: inspDenom > 0 ? Math.round((insRow.pass_count / inspDenom) * 100) : null,
        },
        sla: computeSlaRate([incTypeRow, inspTypeRow]),
        topDowntimeAssets: topAssetsRes?.rows || [],
      };
    }

    const enterpriseMetrics =
      safeScope === "all"
        ? {
            openByType: {
              TASK: taskRow.open_count,
              REQUEST: reqRow.open_count,
              INCIDENT: incTypeRow.open_count,
              INSPECTION: inspTypeRow.open_count,
            },
            overdueTotal:
              taskRow.overdue_count + reqRow.overdue_count + incTypeRow.overdue_count + inspTypeRow.overdue_count,
            pendingApprovalsTotal: appRow.pending_total,
            sla: computeSlaRate([taskRow, reqRow, incTypeRow, inspTypeRow]),
          }
        : null;

    return {
      meta: {
        workspaceId: wsId,
        period: safePeriod,
        scope: safeScope,
        departmentId: departmentId ? Number(departmentId) : null,
        userScope: accessibleDeptIds === null ? "WORKSPACE" : "DEPARTMENT",
        generatedAt: new Date().toISOString(),
      },
      enterprise: enterpriseMetrics,
      office: officeMetrics,
      industrial: industrialMetrics,
      departments: deptRes.rows,
    };
  }
}

export default OperationsAnalytics;
