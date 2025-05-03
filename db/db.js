const mongoose = require("mongoose");

const connectDB = async () => {
  await mongoose
    .connect(process.env.MONGO_DB_URI)
    .then(() => console.log("DB is connected"));
};

module.exports = {
  connectDB,
};
