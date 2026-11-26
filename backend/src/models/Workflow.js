import WorkflowEngine from "../core/WorkflowEngine.js";
import con from "../config/connect.js";

class Workflow {
  static async list() {
    return await WorkflowEngine.getWorkflows();
  }

  static async getDetails(id) {
    return await WorkflowEngine.getWorkflowDetails(id);
  }

  static async getTaskTransitions(taskId, userRoles) {
    return await WorkflowEngine.getAvailableTransitions(taskId, userRoles);
  }

  static async getUserRolesForTask(userId, taskId) {
    return await WorkflowEngine.getUserRolesForTask(userId, taskId);
  }

  static async executeTransition(params) {
    return await WorkflowEngine.executeTransition(params);
  }

  static async createDefinition({ name, code, description }) {
    const res = await con.query(
      `INSERT INTO workflow_definitions (name, code, description)
       VALUES ($1, $2, $3) RETURNING *`,
      [name, code, description]
    );
    return res.rows[0];
  }

  static async createState(workflowId, { code, name, color = '#6B7280', is_initial = false, is_terminal = false, position = 0 }) {
    const res = await con.query(
      `INSERT INTO workflow_states (workflow_id, code, name, color, is_initial, is_terminal, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [workflowId, code, name, color, is_initial, is_terminal, position]
    );
    return res.rows[0];
  }

  static async updateState(stateId, { name, color, is_initial, is_terminal, position }) {
    const res = await con.query(
      `UPDATE workflow_states
       SET name = COALESCE($1, name),
           color = COALESCE($2, color),
           is_initial = COALESCE($3, is_initial),
           is_terminal = COALESCE($4, is_terminal),
           position = COALESCE($5, position)
       WHERE state_id = $6 RETURNING *`,
      [name ?? null, color ?? null, is_initial ?? null, is_terminal ?? null, position ?? null, stateId]
    );
    return res.rows[0] || null;
  }

  static async createTransition(workflowId, { from_state_id, to_state_id, transition_name, allowed_roles = ['admin', 'manager'], required_fields = [], requires_approval = false, trigger_action = null }) {
    const res = await con.query(
      `INSERT INTO workflow_transitions (workflow_id, from_state_id, to_state_id, transition_name, allowed_roles, required_fields, requires_approval, trigger_action)
       VALUES ($1, $2, $3, $4, $5::text[], $6::text[], $7, $8) RETURNING *`,
      [workflowId, from_state_id, to_state_id, transition_name, allowed_roles, required_fields, requires_approval, trigger_action]
    );
    return res.rows[0];
  }

  static async updateTransition(transitionId, { transition_name, allowed_roles, required_fields, requires_approval, trigger_action }) {
    const res = await con.query(
      `UPDATE workflow_transitions
       SET transition_name = COALESCE($1, transition_name),
           allowed_roles = COALESCE($2::text[], allowed_roles),
           required_fields = COALESCE($3::text[], required_fields),
           requires_approval = COALESCE($4, requires_approval),
           trigger_action = COALESCE($5, trigger_action)
       WHERE transition_id = $6 RETURNING *`,
      [transition_name ?? null, allowed_roles ?? null, required_fields ?? null, requires_approval ?? null, trigger_action ?? null, transitionId]
    );
    return res.rows[0] || null;
  }

  static async deleteTransition(transitionId) {
    const res = await con.query(`DELETE FROM workflow_transitions WHERE transition_id = $1 RETURNING *`, [transitionId]);
    return res.rows[0] || null;
  }

  static async getSlaConfigs() {
    const res = await con.query(`
      SELECT sc.*, wd.name AS workflow_name, wd.code AS workflow_code
      FROM sla_configs sc
      LEFT JOIN workflow_definitions wd ON sc.workflow_id = wd.workflow_id
      ORDER BY sc.workflow_id ASC, sc.sla_config_id ASC
    `);
    return res.rows;
  }

  static async upsertSlaConfig({ sla_config_id, workflow_id, severity, target_response_minutes, target_resolve_minutes, warning_threshold_percent = 80 }) {
    if (sla_config_id) {
      const res = await con.query(
        `UPDATE sla_configs
         SET workflow_id = COALESCE($1, workflow_id),
             severity = COALESCE($2, severity),
             target_response_minutes = COALESCE($3, target_response_minutes),
             target_resolve_minutes = COALESCE($4, target_resolve_minutes),
             warning_threshold_percent = COALESCE($5, warning_threshold_percent)
         WHERE sla_config_id = $6 RETURNING *`,
        [workflow_id ?? null, severity ?? null, target_response_minutes ?? null, target_resolve_minutes ?? null, warning_threshold_percent ?? null, sla_config_id]
      );
      return res.rows[0] || null;
    }
    const res = await con.query(
      `INSERT INTO sla_configs (workflow_id, severity, target_response_minutes, target_resolve_minutes, warning_threshold_percent)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [workflow_id || null, severity || 'MEDIUM', target_response_minutes || 60, target_resolve_minutes || 240, warning_threshold_percent]
    );
    return res.rows[0];
  }
}

export default Workflow;
