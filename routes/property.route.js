const { Router } = require("express");
const { z } = require("zod");
const jwt = require("jsonwebtoken");
const { PropertyModel } = require("../models/properties.model");
const { UserModel } = require("../models/users.model");

const propertyRouter = Router();

propertyRouter.post("/list-property", async (req, res) => {
  try {
    const token = req.headers.token;
    const decodedInfo = jwt.verify(token, process.env.JWT_SECRET);
    const id = decodedInfo.id;
    if (!id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const requiredBody = z.object({
      title: z.string({ required_error: "Name of property is required" }),
      description: z.string({
        required_error: "Property description required",
      }),
      location: z.string({ required_error: "Property location is required" }),
      price: z.number({ required_error: "Property price is required" }),
      type: z.string({ required_error: "Property type is required" }),
      size: z.number({ required_error: "Property size is required" }),
      availabilityStatus: z.boolean({
        required_error: "Availability status us required",
      }),
      amenities: z.array(z.string()),
      averageRating: z.number().optional(),
    });

    const parsedBody = requiredBody.safeParse(req.body);

    if (!parsedBody.success) {
      return res.status(422).json({
        message: "Incorrect data format",
        errors: parsedBody.error.errors,
      });
    }

    const {
      title,
      description,
      location,
      price,
      type,
      size,
      availabilityStatus,
      amenities,
      averageRating,
    } = req.body;

    const user = await UserModel.findById(id);
    if (user.isOwner === true) {
      await PropertyModel.create({
        owner: id,
        title: title,
        description: description,
        location: location,
        price: price,
        type: type,
        size: size,
        availabilityStatus: availabilityStatus,
        amenities: amenities,
        averageRating: averageRating,
      });

      res.status(201).json({ message: "Property listed" });
    } else {
      res
        .status(401)
        .json({ message: "Only Property Owners can post properties" });
    }
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
});

propertyRouter.get("/all-properties", async (req, res) => {
  try {
    const properties = await PropertyModel.find();

    res.status(200).json(properties);
  } catch (error) {
    res.status(500).json({ message: "Error in fetching properties" });
  }
});

propertyRouter.delete("/:propertyId", async (req, res) => {
  const propertyId = req.params.propertyId;
  try {
    const token = req.headers.token;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decodedInfo = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedInfo.id;

    const user = await UserModel.findById(userId);
    if (!user || !user.isOwner) {
      return res
        .status(403)
        .json({ message: "Only property owners can delete properties" });
    }

    const property = await PropertyModel.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    if (property.owner.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You can only delete your properties" });
    }

    await PropertyModel.deleteOne({ _id: propertyId });
    res.status(200).json({ message: "Property Deleted" });
  } catch (error) {
    return res.status(400).json({ message: "Unauthorized" });
  }
});

module.exports = {
  propertyRouter,
};
