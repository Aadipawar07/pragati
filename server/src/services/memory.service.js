import mongoose from "mongoose";
import { MemoryItem, MemoryReview, PracticeSession, Subject, Topic } from "../models/index.js";
import { initialSchedule, MEMORY_ALGORITHM_VERSION, scheduleReview } from "./memoryScheduler.service.js";

const ratings = new Set(["again", "hard", "good", "easy"]);
const memoryTypes = new Set(["concept", "definition", "formula", "process", "example", "question"]);

export async function listMemoryTopics(userId) {
  const [topics, subjects] = await Promise.all([
    Topic.find({ userId, status: "active" }).select("_id name subjectId").sort({ name: 1 }).lean(),
    Subject.find({ userId, status: "active" }).select("_id name").lean()
  ]);
  const subjectNames = new Map(subjects.map((subject) => [subject._id.toString(), subject.name]));
  return topics.map((topic) => ({
    id: topic._id.toString(),
    name: topic.name,
    subjectId: topic.subjectId.toString(),
    subject: subjectNames.get(topic.subjectId.toString()) || "Subject"
  }));
}

export async function createMemoryItem(userId, input) {
  const front = input.front.trim();
  const back = input.back.trim();
  if (!front || !back) throw validationError("Recall prompt and answer are required.");
  if (input.memoryType !== undefined && !memoryTypes.has(input.memoryType)) throw validationError("Unsupported memory item type.");

  let topic = null;
  if (input.topicId) {
    topic = await Topic.findOne({ _id: input.topicId, userId, status: "active" }).select("_id").lean();
    if (!topic) throw notFound("Syllabus topic not found.");
  }
  const schedule = initialSchedule();
  const item = await MemoryItem.create({
    userId,
    topicId: topic?._id || null,
    sourceType: topic ? "topic" : "manual",
    sourceId: topic?._id || null,
    front,
    back,
    memoryType: input.memoryType || "concept",
    ...schedule
  });
  return itemDTO(item);
}

export async function createMemoryItemFromPractice(userId, sessionId, questionId) {
  const session = await PracticeSession.findOne({ _id: sessionId, userId, status: "completed" })
    .select("+questions.correctOptionId +questions.expectedAnswer")
    .lean();
  if (!session) throw notFound("Completed practice session not found.");
  const question = session.questions.find((item) => item._id.toString() === questionId);
  if (!question || question.attempt?.gradingStatus !== "graded") throw notFound("Graded question not found in this practice session.");

  const correctAnswer = question.type === "mcq"
    ? question.options.find((option) => option.id === question.correctOptionId)?.text
    : question.expectedAnswer;
  const back = [correctAnswer, question.explanation].filter(Boolean).join("\n\n");
  if (!question.prompt?.trim() || !back.trim() || back.length > 3000) throw validationError("This question does not contain a valid memory prompt and answer.");

  const existing = await MemoryItem.findOne({
    userId,
    sourceType: "practice_question",
    sourceId: question._id
  }).lean();
  if (existing) return itemDTO(existing);

  try {
    const item = await MemoryItem.create({
      userId,
      topicId: question.topicId || session.topicId || null,
      sourceType: "practice_question",
      sourceId: question._id,
      front: question.prompt.trim(),
      back,
      memoryType: "question",
      ...initialSchedule()
    });
    return itemDTO(item);
  } catch (error) {
    if (error.code !== 11000) throw error;
    const duplicate = await MemoryItem.findOne({
      userId,
      sourceType: "practice_question",
      sourceId: question._id
    }).lean();
    if (!duplicate) throw error;
    return itemDTO(duplicate);
  }
}

export async function listMemoryItems(userId, { status = "active", topicId, page = 1, limit = 30 } = {}) {
  const query = { userId, status };
  if (topicId) query.topicId = topicId;
  const [items, total] = await Promise.all([
    MemoryItem.find(query).select("-back -lastReviewRequest").sort({ nextReviewAt: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    MemoryItem.countDocuments(query)
  ]);
  return { items: items.map(itemDTO), page, limit, total, pages: Math.ceil(total / limit) };
}

export async function getMemoryItem(userId, itemId) {
  const item = await MemoryItem.findOne({ _id: itemId, userId }).lean();
  if (!item) throw notFound("Memory item not found.");
  return itemDTO(item, { includeAnswer: true });
}

export async function updateMemoryItem(userId, itemId, input) {
  const updates = {};
  for (const key of ["front", "back"]) {
    if (input[key] !== undefined) {
      if (!input[key].trim()) throw validationError(`${key} cannot be empty.`);
      updates[key] = input[key].trim();
    }
  }
  if (input.memoryType !== undefined) {
    if (!memoryTypes.has(input.memoryType)) throw validationError("Unsupported memory item type.");
    updates.memoryType = input.memoryType;
  }
  if (input.status !== undefined) {
    if (!["active", "suspended", "archived"].includes(input.status)) throw validationError("Unsupported memory item status.");
    updates.status = input.status;
  }
  const item = await MemoryItem.findOneAndUpdate(
    { _id: itemId, userId, status: { $ne: "archived" } },
    { $set: updates },
    { new: true, runValidators: true }
  ).lean();
  if (!item) throw notFound("Memory item not found.");
  return itemDTO(item, { includeAnswer: true });
}

export async function archiveMemoryItem(userId, itemId) {
  const item = await MemoryItem.findOneAndUpdate(
    { _id: itemId, userId, status: { $ne: "archived" } },
    { $set: { status: "archived" } },
    { new: true }
  ).lean();
  if (!item) throw notFound("Memory item not found.");
  return { id: item._id.toString(), status: item.status };
}

export async function getDueMemoryItems(userId, { now = new Date(), limit = 50 } = {}) {
  const [items, dueCount, overdueCount] = await Promise.all([
    MemoryItem.find({ userId, status: "active", nextReviewAt: { $lte: now } })
      .select("-back -lastReviewRequest")
      .sort({ nextReviewAt: 1, createdAt: 1 })
      .limit(limit)
      .lean(),
    MemoryItem.countDocuments({ userId, status: "active", nextReviewAt: { $lte: now } }),
    MemoryItem.countDocuments({ userId, status: "active", nextReviewAt: { $lt: startOfUtcDay(now) } })
  ]);
  return { now, dueCount, overdueCount, items: items.map(itemDTO) };
}

export async function submitMemoryReview(userId, itemId, { rating, requestId }, { now = new Date() } = {}) {
  if (!ratings.has(rating)) throw validationError("Rating must be again, hard, good, or easy.");
  const existing = await MemoryReview.findOne({ userId, requestId }).lean();
  if (existing) {
    if (existing.memoryItemId.toString() !== itemId) throw conflict("This request identifier was already used for another memory item.");
    return reviewDTO(existing, true);
  }

  const item = await MemoryItem.findOne({ _id: itemId, userId }).lean();
  if (!item) throw notFound("Memory item not found.");
  if (item.status !== "active") throw conflict("Only active memory items can be reviewed.");
  if (item.lastReviewRequest?.requestId === requestId) {
    const recovered = await persistReview(userId, item, item.lastReviewRequest);
    return reviewDTO(recovered, true);
  }

  const schedule = scheduleReview(item, rating, now);
  const snapshot = {
    requestId,
    rating,
    scheduledReviewAt: item.nextReviewAt,
    nextReviewAt: schedule.nextReviewAt,
    reviewedAt: now,
    previousIntervalDays: item.intervalDays,
    nextIntervalDays: schedule.intervalDays,
    algorithmVersion: MEMORY_ALGORITHM_VERSION
  };
  const updated = await MemoryItem.updateOne(
    { _id: item._id, userId, status: "active", schedulerRevision: item.schedulerRevision, "lastReviewRequest.requestId": { $ne: requestId } },
    {
      $set: {
        ...schedule,
        lastReviewedAt: now,
        lastRecallRating: rating,
        lastReviewRequest: snapshot
      },
      $inc: { schedulerRevision: 1 }
    }
  );
  if (!updated.modifiedCount) {
    const duplicate = await MemoryReview.findOne({ userId, requestId }).lean();
    if (duplicate) {
      if (duplicate.memoryItemId.toString() !== itemId) throw conflict("This request identifier was already used for another memory item.");
      return reviewDTO(duplicate, true);
    }
    throw conflict("This item was updated by another review. Refresh the queue and try again.");
  }
  const review = await persistReview(userId, item, snapshot);
  return reviewDTO(review, false);
}

export async function listMemoryReviews(userId, { page = 1, limit = 30, memoryItemId } = {}) {
  const query = { userId };
  if (memoryItemId) query.memoryItemId = memoryItemId;
  const [reviews, total] = await Promise.all([
    MemoryReview.find(query).sort({ reviewedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    MemoryReview.countDocuments(query)
  ]);
  const itemIds = [...new Set(reviews.map((review) => review.memoryItemId.toString()))].map((id) => new mongoose.Types.ObjectId(id));
  const items = await MemoryItem.find({ _id: { $in: itemIds }, userId }).select("front topicId").lean();
  const itemById = new Map(items.map((item) => [item._id.toString(), item]));
  return {
    reviews: reviews.map((review) => ({
      ...reviewDTO(review),
      front: itemById.get(review.memoryItemId.toString())?.front || "Archived memory item",
      topicId: review.topicId?.toString() || null
    })),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  };
}

export async function getMemorySummary(userId, { now = new Date() } = {}) {
  const dayStart = startOfUtcDay(now);
  const tomorrow = new Date(dayStart);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const windowStart = new Date(now);
  windowStart.setUTCDate(windowStart.getUTCDate() - 30);
  const ownerId = new mongoose.Types.ObjectId(userId);
  const [
    activeItems,
    dueItems,
    overdueItems,
    scheduledLater,
    reviewsToday,
    ratingGroups,
    recentDifficult,
    topicNeeds
  ] = await Promise.all([
    MemoryItem.countDocuments({ userId, status: "active" }),
    MemoryItem.countDocuments({ userId, status: "active", nextReviewAt: { $lte: now } }),
    MemoryItem.countDocuments({ userId, status: "active", nextReviewAt: { $lt: dayStart } }),
    MemoryItem.countDocuments({ userId, status: "active", nextReviewAt: { $gt: now } }),
    MemoryReview.countDocuments({ userId, reviewedAt: { $gte: dayStart, $lt: tomorrow } }),
    MemoryReview.aggregate([
      { $match: { userId: ownerId, reviewedAt: { $gte: windowStart, $lte: now } } },
      { $group: { _id: "$rating", count: { $sum: 1 } } }
    ]),
    MemoryReview.aggregate([
      { $match: { userId: ownerId, reviewedAt: { $gte: windowStart, $lte: now }, rating: { $in: ["again", "hard"] } } },
      { $sort: { reviewedAt: 1 } },
      { $group: { _id: "$memoryItemId", difficultReviews: { $sum: 1 }, lastRating: { $last: "$rating" }, lastReviewedAt: { $max: "$reviewedAt" } } },
      { $sort: { difficultReviews: -1, lastReviewedAt: -1 } },
      { $limit: 10 }
    ]),
    MemoryReview.aggregate([
      { $match: { userId: ownerId, topicId: { $ne: null }, reviewedAt: { $gte: windowStart, $lte: now }, rating: "again" } },
      { $group: { _id: "$topicId", failedReviews: { $sum: 1 }, items: { $addToSet: "$memoryItemId" } } },
      { $match: { failedReviews: { $gte: 2 } } },
      { $sort: { failedReviews: -1 } },
      { $limit: 10 }
    ])
  ]);
  const counts = Object.fromEntries(ratingGroups.map((group) => [group._id, group.count]));
  const reviewCount30Days = Object.values(counts).reduce((total, count) => total + count, 0);
  const successfulSelfRatings = (counts.good || 0) + (counts.easy || 0);
  const difficultIds = recentDifficult.map((entry) => entry._id);
  const topicIds = topicNeeds.map((entry) => entry._id);
  const [difficultItems, topics] = await Promise.all([
    difficultIds.length
      ? MemoryItem.find({ _id: { $in: difficultIds }, userId, status: "active" }).select("_id front topicId nextReviewAt").lean()
      : [],
    topicIds.length
      ? Topic.find({ _id: { $in: topicIds }, userId }).select("_id name").lean()
      : []
  ]);
  const difficultById = new Map(difficultItems.map((item) => [item._id.toString(), item]));
  const topicNames = new Map(topics.map((topic) => [topic._id.toString(), topic.name]));

  return {
    dateBoundary: "UTC",
    activeItems,
    dueItems,
    overdueItems,
    scheduledLater,
    reviewsCompletedToday: reviewsToday,
    reviewWindowDays: 30,
    reviewsInWindow: reviewCount30Days,
    selfReportedRecallRate: reviewCount30Days
      ? Math.round((successfulSelfRatings / reviewCount30Days) * 100)
      : null,
    ratingDistribution: { again: counts.again || 0, hard: counts.hard || 0, good: counts.good || 0, easy: counts.easy || 0 },
    insufficientRecallData: reviewCount30Days === 0,
    recentlyDifficultItems: recentDifficult.map((entry) => {
      const item = difficultById.get(entry._id.toString());
      return item ? { id: item._id.toString(), front: item.front, topicId: item.topicId?.toString() || null, lastRating: entry.lastRating, difficultReviews: entry.difficultReviews, nextReviewAt: item.nextReviewAt } : null;
    }).filter(Boolean),
    topicsNeedingRevision: topicNeeds.map((entry) => ({
      id: entry._id.toString(),
      name: topicNames.get(entry._id.toString()) || "Syllabus topic",
      failedReviews: entry.failedReviews,
      memoryItems: entry.items.length
    })),
    lastReviewAt: await MemoryReview.findOne({ userId }).sort({ reviewedAt: -1 }).select("reviewedAt").lean().then((review) => review?.reviewedAt || null)
  };
}

async function persistReview(userId, item, snapshot) {
  try {
    return await MemoryReview.findOneAndUpdate(
      { userId, requestId: snapshot.requestId },
      {
        $setOnInsert: {
          userId,
          memoryItemId: item._id,
          topicId: item.topicId || null,
          ...snapshot,
          wasCorrect: null
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  } catch (error) {
    if (error.code !== 11000) throw error;
    const existing = await MemoryReview.findOne({ userId, requestId: snapshot.requestId }).lean();
    if (!existing) throw error;
    return existing;
  }
}

function itemDTO(item, { includeAnswer = false } = {}) {
  const result = {
    id: item._id.toString(),
    topicId: item.topicId?.toString() || null,
    sourceType: item.sourceType,
    sourceId: item.sourceId?.toString() || null,
    front: item.front,
    memoryType: item.memoryType,
    status: item.status,
    repetitionCount: item.repetitionCount,
    intervalDays: item.intervalDays,
    nextReviewAt: item.nextReviewAt,
    lastReviewedAt: item.lastReviewedAt,
    lastRecallRating: item.lastRecallRating,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
  if (includeAnswer) result.back = item.back;
  return result;
}

function reviewDTO(review, idempotent = false) {
  return {
    id: review._id?.toString(),
    memoryItemId: review.memoryItemId.toString(),
    rating: review.rating,
    selfReported: true,
    wasCorrect: review.wasCorrect ?? null,
    scheduledReviewAt: review.scheduledReviewAt,
    reviewedAt: review.reviewedAt,
    previousIntervalDays: review.previousIntervalDays,
    nextIntervalDays: review.nextIntervalDays,
    nextReviewAt: review.nextReviewAt,
    algorithmVersion: review.algorithmVersion,
    idempotent
  };
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = "VALIDATION_ERROR";
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.status = 404;
  error.code = "NOT_FOUND";
  return error;
}

function conflict(message) {
  const error = new Error(message);
  error.status = 409;
  error.code = "MEMORY_REVIEW_CONFLICT";
  return error;
}
