const { Router } = require("express");
const jwt = require("jsonwebtoken");
const { UserModel } = require("../models/users.model");
const { z } = require("zod");

const profileRouter = Router();

profileRouter.get("/my-profile", async (req, res) => {
  try {
    const token = req.headers.token;
    if (!token) {
      console.log("Missing or invalid token");
      return res.status(403).json({ message: "Missing or invalid token" });
    }

    const decodedInfo = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedInfo.id;

    const userData = await UserModel.findById(userId);

    if (!userData) {
      console.log("User does not exists");
      return res.status(404).json({ message: "User does not exists" });
    }

    res.status(200).json(userData);
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

profileRouter.patch("/update-profile", async (req, res) => {
  const requiredBody = z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    isOwner: z.boolean().optional(),
  });

  const parsedBody = requiredBody.safeParse(req.body);

  if (!parsedBody.success) {
    console.log("Incorrect data format");
    return res.status(401).json({ message: "Incorrect data format" });
  }

  const { name, email, phone, isOwner } = req.body;

  try {
    const token = req.headers.token;
    if (!token) {
      console.log("Invalid or missing token");
      return res.status(404).json({ message: "Invalid or missing token" });
    }
    const decodedInfo = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedInfo.id;

    //Fetch user current info
    const userDetails = await UserModel.findById(userId);

    if (!userDetails) {
      console.log("Unauthorised");
      return res.status(403).json({ message: "Unauthorised" });
    }

    const updatedName = name ?? userDetails.name;
    const updatedEmail = email ?? userDetails.email;
    const updatedPhone = phone ?? userDetails.phone;
    const updatedIsOwner = isOwner ?? userDetails.isOwner;

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        name: updatedName,
        email: updatedEmail,
        phone: updatedPhone,
        isOwner: updatedIsOwner,
      },
      { new: true }
    );

    res
      .status(201)
      .json({
        message: `Details updated of user with ID: ${userId}`,
        user: updatedUser,
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

module.exports = {
  profileRouter,
};
