const { Router } = require("express");
const jwt = require("jsonwebtoken");
const { UserModel } = require("../models/users.model");
const { BookingsModel } = require("../models/bookings.model");
const { z } = require("zod");
const { PropertyModel } = require("../models/properties.model");

const bookingRouter = Router();

bookingRouter.post("/add-booking", async (req, res) => {
  try {
    const requiredBody = z.object({
      propertyId: z.string({ required_error: "Property ID is required" }),
      startDate: z
        .string({ required_error: "Start Date is required" })
        .refine((val) => !isNaN(Date.parse(val)), {
          message: "Invalid Start Date",
        }),
      endDate: z
        .string({ required_error: "End Date is required" })
        .refine((val) => !isNaN(Date.parse(val)), {
          message: "Invalid End Date",
        }),
      totalPrice: z.number({ required_error: "Total price is required" }),
    });

    const parsedBody = requiredBody.safeParse(req.body);

    if (!parsedBody.success) {
      return res
        .status(403)
        .json({ message: "Incorrect format", error: parsedBody.error.errors });
    }
    const { propertyId, startDate, endDate, totalPrice } = req.body;

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const token = req.headers.token;
    if (!token) {
      return res.status(401).json({ message: "Invalid or missing Token" });
    }

    try {
      const decodedInfo = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decodedInfo.id;

      const user = await UserModel.findById(userId);

      const duplicateReview = await BookingsModel.find({
        propertyId: propertyId,
        userId: userId,
      });

      if (duplicateReview.length > 0) {
        return res.status(403).json({
          message:
            "You have already booked this property, to book again cancel the earlier booking",
        });
      }

      const overlappingBookings = await BookingsModel.findOne({
        propertyId: propertyId,
        startDate: { $lt: endDateObj },
        endDate: { $gt: startDateObj },
      });

      if (overlappingBookings) {
        return res.status(409).json({
          message: "This property is already booked for the selected dates.",
        });
      }

      if (startDateObj >= endDateObj) {
        return res.status(400).json({
          message: "Start Date cannot be greater than end date",
        });
      }

      if (!user || user.isOwner === true) {
        return res
          .status(403)
          .json({ message: "Only tenants can book a property" });
      }

      await BookingsModel.create({
        propertyId: propertyId,
        userId: userId,
        startDate: startDateObj,
        endDate: endDateObj,
        totalPrice: totalPrice,
        bookingStatus: "pending",
      });

      res.status(201).json({
        message: `Successfully booked Property with ID: ${propertyId}`,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error while verifying token, please login again" });
    }
  } catch (error) {
    res.status(403).json({ message: "Login to book a property" });
  }
});

//For tenants, too see their all bookings
bookingRouter.get("/my-bookings", async (req, res) => {
  const token = req.headers.token;
  if (!token) {
    return res.status(403).json({ message: "Missing or invalid token" });
  }
  try {
    const decodedInfo = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedInfo.id;

    const user = await UserModel.findOne({ _id: userId });
    if (user.isOwner === true) {
      return res
        .status(403)
        .json({ message: "Only tenants can see their bookings" });
    }

    const bookings = await BookingsModel.find({ userId: userId });
    if (!bookings.length) {
      return res.status(404).json({ message: "No bookings found" });
    }

    res.status(200).json(bookings);
  } catch (error) {
    return res.status(404).json({
      message: "Error in Token Verification, login again to continue",
    });
  }
});

//Route to update bookingStatus of a review, only to be done by owners
bookingRouter.put("/update-status", async (req, res) => {
  const requiredBody = z.object({
    bookingId: z.string({ required_error: "Property ID is required" }),
    status: z.enum(["pending", "approved", "cancelled"]),
  });

  const parsedBody = requiredBody.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(401).json({ message: "Incorrect data format" });
  }

  const { bookingId, status } = req.body;

  const token = req.headers.token;
  if (!token) {
    return res.status(401).json({ message: "Invalid or missing Token" });
  }

  try {
    const decodedInfo = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedInfo.id;

    const user = await UserModel.findById(userId);

    if (user.isOwner === false) {
      return res.status(403).json({
        message:
          "Only property owners can update status of a booking for their property",
      });
    }

    const booking = await BookingsModel.findById(bookingId);

    if (!booking) {
      return res
        .status(404)
        .json({ message: `No booking found with this ID: ${bookingId}` });
    }

    const property = await PropertyModel.findById(booking.propertyId);
    if (property.owner.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "You do not own this property" });
    }

    await BookingsModel.updateOne(
      { _id: bookingId },
      { $set: { bookingStatus: status } }
    );

    res.status(200).json({ message: "bookingStatus updated" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error in verifying token" });
  }
});

// Cancel a booking by a tenant
bookingRouter.delete("/delete", async (req, res) => {
  const bookingId = req.query.booking_id;

  if (!bookingId) {
    return res.status(400).json({ message: "Booking ID is required" });
  }

  try {
    const token = req.headers.token;
    if (!token) {
      console.log("Invalid or missing token");
      return res.status(403).json({ message: "Invalid or missing token" });
    }
    const decodedInfo = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedInfo.id;

    const user = await UserModel.findById(userId);

    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: "User is not found" });
    }

    if (user.isOwner === true) {
      console.log("Only tenants can cancel bookings");
      return res
        .status(403)
        .json({ message: "Only tenants can cancel their bookings" });
    }

    //to check of they are not deleting someone else's booking
    const isBooking = await BookingsModel.findOne({
      _id: bookingId,
      userId: userId,
    });

    if (!isBooking) {
      console.log("There are no bookings made by you for this property");
      return res.status(404).json({
        message: `There are no bookings made by you for this property: ${bookingId}`,
      });
    }

    await BookingsModel.deleteOne({ _id: bookingId, userId: userId });
    return res.status(200).json({
      message: `Booking with bookingId: ${isBooking._id} successfully deleted`,
    });
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      console.log("Invalid or expired token");
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    console.log("Server error:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// GET Details of individual booking
bookingRouter.get("/booking-info", async (req, res) => {
  const bookingId = req.query.booking_id;

  if (!bookingId) {
    console.log("Booking Id is required");
    return res.status(400).json({ message: "Booking ID is required" });
  }

  try {
    const token = req.headers.token;
    if (!token) {
      console.log("Invalid or missing token");
      return res.status(404).json({ message: "Invalid or missing token" });
    }
    const decodedInfo = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedInfo.id;

    const user = await UserModel.findById(userId);

    if (!user) {
      console.log("User does not exists");
      return res.status(404).json({ message: "User does not exists" });
    }

    if (user.isOwner === false) {
      const bookingExists = await BookingsModel.findOne({
        _id: bookingId,
        userId: userId,
      });
      if (!bookingExists) {
        console.log("Booking does not exists");
        return res.status(404).json({ message: "Booking does not exists" });
      }
      if (bookingExists.userId !== userId) {
        console.log(`You cannot see details of other people's booking`);
      }
      return res.status(200).json(bookingExists);
    } else {
      const booking = await BookingsModel.findOne({ _id: bookingId });
      if (!booking) {
        console.log("Booking does not exist");
        return res.status(404).json({ message: "Booking does not exist" });
      }
      const propertyId = booking.propertyId;

      //to restrict from seeing other owner's property's booking details
      const isPropertyOwn = await PropertyModel.findOne({
        owner: userId,
        _id: propertyId,
      });

      if (!isPropertyOwn) {
        console.log(
          "You cannot see details of other owner's property's booking details"
        );
        return res.status(403).json({
          message:
            "You cannot see details of other owner's property's booking details",
        });
      }
      return res.status(200).json(booking);
    }
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      console.log("Invalid or expired token");
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    console.log("Server error:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

//Booking of individual properties, to be shown to owner, so he can approve
bookingRouter.get("/:propertyId", async (req, res) => {
  const propertyId = req.params.propertyId;
  const token = req.headers.token;
  if (!token) {
    return res.status(401).json({ message: "Invalid or missing Token" });
  }
  try {
    const decodedInfo = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedInfo.id;

    const user = await UserModel.findById(userId);
    if (user.isOwner === false) {
      return res.status(401).json({
        message: "Only Property owners can see bookings for their property",
      });
    }
    //To check if propertyId is valid
    const property = await PropertyModel.findById(propertyId);
    if (!property) {
      return res.status(400).json({ message: "Invalid PropertyId" });
    }
    //to check a owner should only see his properties
    if (property.owner.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "You do not own this property" });
    }

    const booking = await BookingsModel.find({ propertyId: propertyId });

    if (!booking.length > 0) {
      return res
        .status(404)
        .json({ message: `No bookings found for propertyId: ${propertyId}` });
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(403).json({ message: "Login to book a property" });
  }
});

module.exports = {
  bookingRouter,
};
