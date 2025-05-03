const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const propertySchema = new Schema(
  {
    owner: {
      type: ObjectId,
      ref: "users",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    availabilityStatus: {
      type: Boolean,
      required: true,
    },
    amenities: {
      type: [String],
      required: true,
    },
    averageRating: {
      type: Number,
      required: false,
    },
  },
  { timestamps: true }
);

const PropertyModel = mongoose.model("properties", propertySchema);

module.exports = {
  PropertyModel,
};
