const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    isOwner: {
      type: Boolean,
      required: true,
    },
  },
  { timestamps: true }
);

const UserModel = mongoose.model("users", UserSchema);

module.exports = {
  UserModel,
};
