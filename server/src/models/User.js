import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true, select: false }
}, { timestamps: true, collection: "users" });

export default mongoose.models.User || mongoose.model("User", userSchema);
