const Joi = require('joi');

// Listing Joi Schema
module.exports.listingSchema = Joi.object({
  listing: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    images: Joi.array().items(
      Joi.object({
        url: Joi.string().uri().required(),
        filename: Joi.string().required()
      })
    ).optional(), // optional as images can be handled via multer/cloudinary
    price: Joi.number().min(0).required(),
    location: Joi.string().required(),
    country: Joi.string().required(),
    category: Joi.string().required(),
    type: Joi.string().optional(),
    size: Joi.string().optional(),
    condition: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional()
  }).required()
});

// Review Joi Schema
module.exports.reviewSchema = Joi.object({
  review: Joi.object({
    comment: Joi.string().required(),
    rating: Joi.number().min(1).max(5).required()
  }).required()
});

// Swap Joi Schema
module.exports.swapSchema = Joi.object({
  swap: Joi.object({
    senderId: Joi.string().required(),
    receiverId: Joi.string().required(),
    senderItemId: Joi.string().required(),
    receiverItemId: Joi.string().required(),
    status: Joi.string().valid('pending', 'approved', 'rejected').default('pending')
  }).required()
});