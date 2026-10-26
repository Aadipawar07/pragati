export const MEMORY_ALGORITHM_VERSION = "pragati-sm2-inspired-v1";

const MIN_EASE_FACTOR = 1.3;
const MAX_EASE_FACTOR = 3;
const MAX_INTERVAL_DAYS = 365;
const ratingQuality = { again: 1, hard: 3, good: 4, easy: 5 };

export function initialSchedule(now = new Date()) {
  return { repetitionCount: 0, intervalDays: 0, easeFactor: 2.3, nextReviewAt: new Date(now) };
}

export function scheduleReview(item, rating, now = new Date()) {
  if (!Object.hasOwn(ratingQuality, rating)) {
    const error = new Error("Rating must be again, hard, good, or easy.");
    error.status = 400;
    error.code = "INVALID_MEMORY_RATING";
    throw error;
  }
  const quality = ratingQuality[rating];
  const previousIntervalDays = Math.max(0, Number(item.intervalDays) || 0);
  const previousEase = Math.min(MAX_EASE_FACTOR, Math.max(MIN_EASE_FACTOR, Number(item.easeFactor) || 2.3));
  const easeFactor = Math.round(Math.min(MAX_EASE_FACTOR, Math.max(
    MIN_EASE_FACTOR,
    previousEase + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  )) * 100) / 100;

  let repetitionCount;
  let intervalDays;
  if (rating === "again") {
    repetitionCount = 0;
    intervalDays = 1;
  } else {
    repetitionCount = (Number(item.repetitionCount) || 0) + 1;
    if (rating === "hard") {
      intervalDays = Math.max(1, Math.ceil((previousIntervalDays || 1) * 1.2));
    } else if (rating === "easy") {
      intervalDays = Math.max(2, Math.ceil((previousIntervalDays || 1) * (previousEase + 0.3)));
    } else {
      intervalDays = repetitionCount === 1
        ? 1
        : repetitionCount === 2
          ? 3
          : Math.ceil((previousIntervalDays || 3) * previousEase);
    }
  }

  intervalDays = Math.min(MAX_INTERVAL_DAYS, intervalDays);
  const nextReviewAt = new Date(now);
  nextReviewAt.setUTCDate(nextReviewAt.getUTCDate() + intervalDays);
  return { repetitionCount, intervalDays, easeFactor, nextReviewAt };
}
