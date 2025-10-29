import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },

    carMake: { type: String, required: true },
    carModel: { type: String, required: true },
    carColor: { type: String },

    locationAddress: { type: String, required: true },
    locationNotes: { type: String },

    scheduledAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "assigned", "in_progress", "done", "canceled"],
      default: "pending",
    },

    assignedWasher: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    totalPriceEUR: { type: Number, required: true },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },
    paymentIntentId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", BookingSchema);
