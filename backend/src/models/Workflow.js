import WorkflowEngine from "../core/WorkflowEngine.js";
import con from "../config/connect.js";

class Workflow {
  static async list() {
    return await WorkflowEngine.getWorkflows();
  }

  static async getDetails(id) {
    return await WorkflowEngine.getWorkflowDetails(id);
  }

  static async getTaskTransitions(taskId, userRole) {
    return await WorkflowEngine.getAvailableTransitions(taskId, userRole);
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
}

export default Workflow;
