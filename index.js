require("dotenv").config();
const express = require("express");
const cors = require("cors");
const PORT = process.env.PORT;
const { authRouter } = require("./routes/auth.route");
const { propertyRouter } = require("./routes/property.route");
const { ReviewModel } = require("./models/reviews.model");
const { connectDB } = require("./db/db");
const { reviewRouter } = require("./routes/reviews.route");
const { bookingRouter } = require("./routes/booking.route");

const app = express();
app.use(express.json());

connectDB();

const whiteList = ["http://localhost:3000"];
app.use(
  cors({
    origin: whiteList,
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.send("Hello");
});

app.use("/auth", authRouter);
app.use("/properties", propertyRouter);
app.use("/reviews", reviewRouter);
app.use("/bookings", bookingRouter);

app.listen(PORT || 3000, () => {
  console.log(`The server is running on http://localhost:${PORT}`);
});
