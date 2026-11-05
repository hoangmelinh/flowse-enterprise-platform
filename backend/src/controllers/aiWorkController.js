// Flowse AI chế độ Work: áp dụng / huỷ đề xuất và lịch sử thao tác. Lỗi AppError đi qua errorMiddleware.
import { applyAction, cancelAction, listActions } from "../models/AiAction.js";

const actionId = (req) => Number(req.params.id);

export const applyAiAction = async (req, res, next) => {
    try {
        res.json({ data: await applyAction(req.user.user_id, actionId(req)) });
    } catch (err) {
        next(err);
    }
};

export const cancelAiAction = async (req, res, next) => {
    try {
        res.json({ data: await cancelAction(req.user.user_id, actionId(req)) });
    } catch (err) {
        next(err);
    }
};

export const listAiActions = async (req, res, next) => {
    try {
        res.json({ data: await listActions(req.user.user_id) });
    } catch (err) {
        next(err);
    }
};
