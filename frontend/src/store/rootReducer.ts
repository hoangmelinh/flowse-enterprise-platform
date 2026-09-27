import appReducer from './modules/app/index.ts';
import workspacesReducer from './modules/workspaces/index.ts';
import authReducer from './modules/auth/index.ts';
import spacesReducer from './modules/spaces/index.ts';
import tasksReducer from './modules/tasks/index.ts';
import treeReducer from './modules/tree/index.ts';
import statusesReducer from './modules/statuses/index.ts';
import commentsReducer from './modules/comments/index.ts';
import timeLogsReducer from './modules/timelogs/index.ts';
import milestonesReducer from './modules/milestones/index.ts';
import sprintsReducer from './modules/sprints/index.ts';
import notificationsReducer from './modules/notifications/index.ts';
import aiReducer from './modules/ai/index.ts';
import activityLogsReducer from './modules/activityLogs/index.ts';
import usersReducer from './modules/users/index.ts';

const rootReducer = {
    app: appReducer,
    auth: authReducer,
    workspaces: workspacesReducer,
    spaces: spacesReducer,
    tasks: tasksReducer,
    tree: treeReducer,
    statuses: statusesReducer,
    comments: commentsReducer,
    timelogs: timeLogsReducer,
    milestones: milestonesReducer,
    sprints: sprintsReducer,
    notifications: notificationsReducer,
    ai: aiReducer,
    activityLogs: activityLogsReducer,
    users: usersReducer,
};

export default rootReducer;
