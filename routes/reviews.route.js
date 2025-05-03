const { Router } = require("express");
const { z } = require("zod");
const jwt = require("jsonwebtoken");
const { ReviewModel } = require("../models/reviews.model");
const { UserModel } = require("../models/users.model");
const { PropertyModel } = require("../models/properties.model");

const reviewRouter = Router();

reviewRouter.post("/add-review", async (req, res) => {
  try {
    const token = req.headers.token;
    const decodedInfo = jwt.verify(token, process.env.JWT_SECRET);
    const id = decodedInfo.id;
    if (!id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const requiredBody = z.object({
      rating: z.number({ required_error: "Rating is required" }),
      comment: z.string({ required_error: "Comment is required" }),
      propertyId: z.string({ required_error: "Property ID is required" }),
    });

    const parsedBody = requiredBody.safeParse(req.body);

    if (!parsedBody.success) {
      return res.status(422).json({ message: "Incorrect data format" });
    }

    const { rating, comment, propertyId } = req.body;

    const user = await UserModel.findById(id);

    if (!user) {
      return res.status(401).json({ message: "Login to post a review" });
    }

    const hasUserAlreadyReviewed = await ReviewModel.findOne({
      userId: id,
      propertyId: propertyId,
    });

    if (hasUserAlreadyReviewed) {
      return res
        .status(400)
        .json({ message: "You cannot review a property twice" });
    }

    if (user.isOwner === false) {
      await ReviewModel.create({
        rating: rating,
        comment: comment,
        propertyId: propertyId,
        userId: id,
      });

      const allReviews = await ReviewModel.find({ propertyId: propertyId });

      const totalRating = allReviews.reduce(
        (sum, review) => sum + review.rating,
        0
      );

      const averageRating = totalRating / allReviews.length;

      await PropertyModel.findByIdAndUpdate(
        propertyId,
        {
          averageRating: averageRating,
        },
        { new: true }
      );

      res.status(201).json({ message: "Review successfully posted" });
    } else {
      res.status(401).json({ message: "Only Tenants can post review" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Error in posting review" });
  }
});

reviewRouter.get("/my-reviews", async (req, res) => {
  try {
    const token = req.headers.token;
    const decodedInfo = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedInfo.id;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(400).json({ message: "Login to continue" });
    }
    const reviews = await ReviewModel.find({ userId }).sort({ createdAt: -1 });
    if (!reviews.length) {
      return res
        .status(404)
        .json({ message: `There are no reviews for ${user.name}` });
    }
    res.status(200).json(reviews);
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
});

reviewRouter.get("/:propertyId", async (req, res) => {
  const propertyId = req.params.propertyId;
  try {
    const reviews = await ReviewModel.find({ propertyId }).sort({
      createdAt: -1,
    });
    if (!reviews.length) {
      return res
        .status(404)
        .json({ message: "There are currently no reviews for this property" });
    }
    res.status(200).json(reviews);
  } catch (error) {
    return res.status(500).json({
      message: `Error in fetching reviews for propertyId: ${propertyId}`,
    });
  }
});

module.exports = {
  reviewRouter,
};
