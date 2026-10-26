import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  name: { type: String, trim: true },
  college: { type: String, trim: true },
  course: { type: String, trim: true },
  year: { type: String, trim: true },
  semester: { type: String, trim: true },
  batch: { type: String, trim: true },
  preferredLanguage: { type: String, trim: true },
  studyPreferences: {
    hoursPerDay: { type: Number, min: 1, max: 24 },
    daysPerWeek: { type: Number, min: 1, max: 7 },
    preferredLanguages: [{ type: String, trim: true }],
    learningPreferences: [{ type: String, trim: true }]
  },
  availability: {
    hoursPerDay: { type: Number, min: 1, max: 24 },
    daysPerWeek: { type: Number, min: 1, max: 7 },
    timezone: { type: String, trim: true }
  },
  careerPreferences: {
    interestedField: { type: String, trim: true },
    targetRole: { type: String, trim: true },
    skillLevel: { type: String, trim: true }
  },
  onboardingComplete: { type: Boolean, default: false }
}, { timestamps: true, collection: "profiles" });

export default mongoose.models.Profile || mongoose.model("Profile", profileSchema);
