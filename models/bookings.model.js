const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const bookingsSchema = new Schema(
  {
    propertyId: {
      type: ObjectId,
      ref: "properties",
      required: true,
    },
    userId: {
      type: ObjectId,
      ref: "users",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    bookingStatus: {
      type: String,
      required: true,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const BookingsModel = mongoose.model("bookings", bookingsSchema);

module.exports = {
  BookingsModel,
};
