import mongoose from "mongoose";
import destinationSearchRepository from "../repositories/destinationSearchRepository.js";
import { SEARCH_STATUSES } from "../models/DestinationSearch.js";
import HttpError from "../utils/HttpError.js";

// History of the AI destination recommendations of one user: list, open again, mark as used, delete.

export const MAX_SEARCHES_KEPT = 30;
const NOT_FOUND = "This suggestion does not exist";

const validId = (id) => {
    if (!mongoose.isValidObjectId(id)) {
        throw new HttpError(404, NOT_FOUND);
    }
};

const toSummary = (search) => ({
    id: String(search._id),
    query: search.query,
    interests: search.interests,
    region: search.region,
    budget: search.budget,
    count: search.recommendations.length,
    names: search.recommendations.slice(0, 3).map((item) => item.name),
    status: search.status,
    tripId: search.tripId ? String(search.tripId) : undefined,
    createdAt: search.createdAt,
});

const toDetail = (search) => ({
    ...toSummary(search),
    recommendations: search.recommendations,
});

const list = async (userId, status) => {
    if (status !== undefined && !SEARCH_STATUSES.includes(status)) {
        throw new HttpError(400, `status must be one of: ${SEARCH_STATUSES.join(", ")}`);
    }
    const items = await destinationSearchRepository.listByUser(userId, status, MAX_SEARCHES_KEPT);
    return { message: "Get suggestions successfully", items: items.map(toSummary) };
};

const get = async (userId, id) => {
    validId(id);
    const search = await destinationSearchRepository.findOwned(id, userId);
    if (!search) {
        throw new HttpError(404, NOT_FOUND);
    }
    return { message: "Get suggestion successfully", search: toDetail(search) };
};

// { status: "draft" | "created", tripId? }: "created" once the user started a plan from it
const update = async (userId, id, body = {}) => {
    validId(id);
    if (!SEARCH_STATUSES.includes(body.status)) {
        throw new HttpError(400, `status must be one of: ${SEARCH_STATUSES.join(", ")}`);
    }
    if (body.tripId !== undefined && !mongoose.isValidObjectId(body.tripId)) {
        throw new HttpError(400, "Invalid tripId");
    }
    const search = await destinationSearchRepository.updateOwned(id, userId, {
        status: body.status,
        ...(body.tripId !== undefined && { tripId: body.tripId }),
    });
    if (!search) {
        throw new HttpError(404, NOT_FOUND);
    }
    return { message: "Suggestion updated", search: toSummary(search) };
};

const remove = async (userId, id) => {
    validId(id);
    const { deletedCount } = await destinationSearchRepository.removeOwned(id, userId);
    if (!deletedCount) {
        throw new HttpError(404, NOT_FOUND);
    }
    return { message: "Suggestion deleted" };
};

export default { list, get, update, remove };
