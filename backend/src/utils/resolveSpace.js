import {
    getSpaceIdByTaskId,
    getSpaceIdByListId,
    getSpaceIdByFolderId,
    getSpaceIdByAttachmentId,
    getSpaceIdByCommentId,
    getSpaceIdBySprintId,
    getSpaceIdByMilestoneId,
    getSpaceIdByStatusId,
    getSpaceIdByTimeLogId,
} from '../models/Permission.js';

const PARAM_TO_SPACE_LOOKUP = [
    { param: 'taskId',       fn: getSpaceIdByTaskId,       notFoundMsg: 'Task khong ton tai hoac da bi xoa.' },
    { param: 'listId',       fn: getSpaceIdByListId,       notFoundMsg: 'List khong ton tai hoac da bi xoa.' },
    { param: 'list_id',      fn: getSpaceIdByListId,       notFoundMsg: 'List khong ton tai hoac da bi xoa.' },
    { param: 'folderId',     fn: getSpaceIdByFolderId,     notFoundMsg: 'Folder khong ton tai hoac da bi xoa.' },
    { param: 'folder_id',    fn: getSpaceIdByFolderId,     notFoundMsg: 'Folder khong ton tai hoac da bi xoa.' },
    { param: 'attachmentId', fn: getSpaceIdByAttachmentId, notFoundMsg: 'Tep dinh kem khong ton tai hoac da bi xoa.' },
    { param: 'commentId',    fn: getSpaceIdByCommentId,    notFoundMsg: 'Binh luan khong ton tai hoac da bi xoa.' },
    { param: 'sprintId',     fn: getSpaceIdBySprintId,     notFoundMsg: 'Sprint khong ton tai hoac da bi xoa.' },
    { param: 'milestoneId',  fn: getSpaceIdByMilestoneId,  notFoundMsg: 'Milestone khong ton tai hoac da bi xoa.' },
    { param: 'statusId',     fn: getSpaceIdByStatusId,     notFoundMsg: 'Trang thai khong ton tai.' },
    { param: 'timeLogId',    fn: getSpaceIdByTimeLogId,    notFoundMsg: 'Time log khong ton tai hoac da bi xoa.' },
];

export async function resolveSpaceIdFromParams(params = {}) {
    for (const { param, fn, notFoundMsg } of PARAM_TO_SPACE_LOOKUP) {
        if (!params[param]) continue;
        const spaceId = await fn(params[param]);
        if (!spaceId) return { spaceId: null, error: notFoundMsg };
        return { spaceId, error: null };
    }
    return { spaceId: null, error: null };
}

export function getDirectSpaceId(req) {
    return req.params.spaceId || req.params.space_id
        || req.body?.spaceId || req.body?.space_id
        || null;
}
