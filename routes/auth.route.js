const { Router } = require("express");
const { z } = require("zod");
const authRouter = Router();
const { UserModel } = require("../models/users.model");
const jwt = require("jsonwebtoken");
const { hashPassword } = require("../middlewares/auth.middleware");
const bcrypt = require("bcrypt");

authRouter.post("/signup", hashPassword, async (req, res) => {
  const requiredBody = z.object({
    name: z
      .string({ required_error: "Name is required" })
      .min(2, { message: "Name should be more than 1 characters" })
      .max(100, { message: "Name should be less than 100 characters" }),
    email: z
      .string({ required_error: "Email is required" })
      .min(2)
      .max(100)
      .email({ message: "Please enter a valid email" }),
    password: z
      .string({ required_error: "Password is required" })
      .min(6, { message: "Password should be more than 6 characters" })
      .max(100, { message: "Password should be less than 100 characters" }),
    phone: z
      .string({ required_error: "Phone Number is required" })
      .min(10, { message: "Phone number is required" }),
    isOwner: z.boolean({ required_error: "Customer type required" }),
  });

  const parsedBody = requiredBody.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(422).json({ message: "Incorrect data format" });
  }

  const { name, email, password, phone, isOwner } = req.body;

  try {
    await UserModel.create({
      name: name,
      email: email,
      password: password,
      phone: phone,
      isOwner: isOwner,
    });
    res.status(201).json({ message: "You have successfully signed up" });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(400).json({
        message: "Email is already registered. Please use a different one.",
      });
    }
    res
      .status(400)
      .json({ message: "Error in registering user", error: error });
  }
});

authRouter.post("/login", async (req, res) => {
  const requiredBody = z.object({
    email: z
      .string({ required_error: "Email is required" })
      .min(2)
      .max(100)
      .email({ message: "Please enter a valid email" }),
    password: z
      .string({ required_error: "Password is required" })
      .min(6, { message: "Password should be more than 6 characters" })
      .max(100, { message: "Password should be less than 100 characters" }),
  });

  const parsedBody = requiredBody.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(422).json({ message: "Incorrect data format" });
  }

  const { email, password } = req.body;

  try {
    const foundUser = await UserModel.findOne({
      email: email,
    });
    if (!foundUser) {
      return res.status(401).json({ message: "Wrong Credentials" });
    }
    const isUserAuthenticated = await bcrypt.compare(
      password,
      foundUser.password
    );

    if (!isUserAuthenticated) {
      return res.status(401).json({ message: "Wrong Credentials" });
    }
    const token = jwt.sign(
      {
        id: foundUser._id,
      },
      process.env.JWT_SECRET
    );
    res.status(200).json(token);
  } catch (error) {
    res.status(400).json({ message: "Unable to login" });
  }
});

module.exports = {
  authRouter,
};
