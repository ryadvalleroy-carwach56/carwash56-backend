import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    address: { type: String },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["client", "admin", "washer"],
      default: "client",
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
