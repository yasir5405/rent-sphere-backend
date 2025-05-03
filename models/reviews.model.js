const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const reviewSchema = new Schema(
  {
    rating: {
      type: Number,
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
    propertyId: {
      type: ObjectId,
      ref: "properties",
    },
    userId: {
      type: ObjectId,
      ref: "users",
    },
  },
  { timestamps: true }
);

const ReviewModel = mongoose.model("reviews", reviewSchema);

module.exports = {
  ReviewModel,
};
