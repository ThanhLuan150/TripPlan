import mongoose from "mongoose";
import tripRouteProposalRepository from "../repositories/tripRouteProposalRepository.js";
import tripDayRepository from "../repositories/tripDayRepository.js";
import challengeRepository from "../repositories/challengeRepository.js";
import HttpError from "../utils/HttpError.js";
import { getRouteMatrix } from "../utils/routing.js";
import { bestOrder, haversine, pathCost, positionOf } from "../utils/routeOrder.js";

// Route optimization of ONE day: proposes a better visiting order of the places the day already has.
// proposeRoute writes nothing but the stored proposal; the itinerary only changes in applyRoute (the
// user accepted). It never adds or removes a place, and the distances and times it shows come from the
// routing service (OSRM) or, when that is down, from the coordinates (straight line, no time at all).

const MIN_PLACES = 3; // with the first place fixed as the start, fewer than 3 places cannot be reordered
const MAX_PLACES = 25;

const describe = (challenge) => ({
    id: String(challenge._id),
    name: challenge.nameLocation,
    location: challenge.location ?? null,
});

// Cost matrices between the places that have a position, from the routing service when it answers.
// source "road": distance (m) and duration (s) by road; "straight-line": distance only, duration null.
const travelMatrix = async (positions) => {
    try {
        const matrix = await getRouteMatrix(positions);
        if (matrix) {
            return { source: "road", distances: matrix.distances, durations: matrix.durations };
        }
    } catch (err) {
        console.log(`[route-optimization] ${err.message}`);
    }
    const distances = positions.map((a) => positions.map((b) => haversine(a, b)));
    return { source: "straight-line", distances, durations: null };
};

// Legs and totals of a visiting order (indexes of the located places)
const measure = (order, matrix) => {
    const legs = order.slice(1).map((to, i) => ({
        from: order[i],
        to,
        distance: Math.round(matrix.distances[order[i]][to]),
        duration: matrix.durations ? Math.round(matrix.durations[order[i]][to]) : null,
    }));
    return {
        legs,
        distance: legs.reduce((sum, leg) => sum + leg.distance, 0),
        duration: matrix.durations ? legs.reduce((sum, leg) => sum + leg.duration, 0) : null,
    };
};

const findDay = async (trip, dayId) => {
    const days = await tripDayRepository.findByTripId(trip._id);
    const day = mongoose.isValidObjectId(dayId) ? days.find((d) => String(d._id) === String(dayId)) : undefined;
    if (!day) {
        throw new HttpError(404, "This day is not part of the trip", { code: "ROUTE_DAY_NOT_FOUND" });
    }
    return day;
};

// Proposes a new order for the day. Places without a position keep their slot in the list; the
// others are reordered (the first of them stays the starting point).
const proposeRoute = async (trip, userId, dayId) => {
    const day = await findDay(trip, dayId);
    const challenges = await challengeRepository.findByTripDayId(day._id);
    if (challenges.length > MAX_PLACES) {
        throw new HttpError(400, `This day has too many places to optimize (max ${MAX_PLACES})`, { code: "ROUTE_TOO_MANY_PLACES" });
    }
    const located = challenges
        .map((challenge, slot) => ({ challenge, slot, position: positionOf(challenge.latitude, challenge.longitude) }))
        .filter((entry) => entry.position);
    const missing = challenges.filter((c) => !positionOf(c.latitude, c.longitude)).map(describe);
    if (located.length < MIN_PLACES) {
        throw new HttpError(400, "At least 3 places with a known position are needed to optimize this day", {
            code: "ROUTE_NOT_ENOUGH_COORDINATES",
            missingCoordinates: missing,
        });
    }

    const matrix = await travelMatrix(located.map((entry) => entry.position));
    const cost = matrix.durations ?? matrix.distances;
    const currentIdx = located.map((_, i) => i);
    const bestIdx = bestOrder(cost);
    // only a strictly cheaper order is a proposal: ties keep the order the user made
    const better = pathCost(bestIdx, cost) < pathCost(currentIdx, cost);
    const proposedIdx = better ? bestIdx : currentIdx;

    // the whole day as it would be saved: movable places in their new order, the others where they were
    const proposed = [...challenges];
    located.forEach((entry, i) => {
        proposed[entry.slot] = located[proposedIdx[i]].challenge;
    });

    const summarize = (order) => {
        const { legs, distance, duration } = measure(order, matrix);
        return {
            legs: legs.map((leg) => ({
                from: String(located[leg.from].challenge._id),
                to: String(located[leg.to].challenge._id),
                distance: leg.distance,
                duration: leg.duration,
            })),
            distance,
            duration,
        };
    };
    const result = {
        dayId: String(day._id),
        source: matrix.source,
        missingCoordinates: missing,
        current: summarize(currentIdx),
        proposed: summarize(proposedIdx),
        currentOrder: challenges.map(describe),
        proposedOrder: proposed.map(describe),
        improved: better,
    };
    if (!better) {
        return { ...result, message: "The current order is already the shortest, nothing to change", proposalId: null };
    }
    const saved = await tripRouteProposalRepository.create({
        tripId: trip._id,
        userId,
        dayId: day._id,
        baseOrder: challenges.map((c) => String(c._id)),
        order: proposed.map((c) => String(c._id)),
    });
    return { ...result, message: "Proposal created, nothing is saved yet", proposalId: String(saved._id) };
};

// The owner changed their mind: forget the proposal. The itinerary is not touched.
const discardRoute = async (trip, userId, proposalId) => {
    if (mongoose.isValidObjectId(proposalId)) {
        await tripRouteProposalRepository.remove(proposalId, trip._id, userId);
    }
    return { message: "Proposal discarded" };
};

// same ids, each exactly once
const sameSet = (a, b) => {
    const left = new Set(a);
    return left.size === a.length && a.length === b.length && b.every((id) => left.has(id)) && new Set(b).size === b.length;
};

// Saves the stored proposal the user accepted: only the position of each place changes. Refuses (409)
// when the day gained or lost a place since the proposal was made, so no place is ever lost.
const applyRoute = async (trip, userId, proposalId) => {
    const proposal = mongoose.isValidObjectId(proposalId) ? await tripRouteProposalRepository.findOwned(proposalId, trip._id, userId) : null;
    if (!proposal) {
        throw new HttpError(404, "This proposal does not exist or has expired, optimize again", { code: "ROUTE_PROPOSAL_NOT_FOUND" });
    }
    const day = await findDay(trip, proposal.dayId);
    const challenges = await challengeRepository.findByTripDayId(day._id);
    const current = challenges.map((c) => String(c._id));
    if (!sameSet(current, proposal.baseOrder) || !sameSet(current, proposal.order)) {
        throw new HttpError(409, "The day changed since this proposal was made, optimize again", { code: "ROUTE_DAY_CHANGED" });
    }
    for (const [index, id] of proposal.order.entries()) {
        await challengeRepository.updateById(id, { order: index });
    }
    await tripRouteProposalRepository.removeByDay(day._id);
    return { message: "Route updated successfully", tripId: trip._id, dayId: String(day._id) };
};

export default { proposeRoute, applyRoute, discardRoute };
