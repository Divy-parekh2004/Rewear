// utils/middleware.js
const { listingSchema, reviewSchema } = require('../schema');
const ExpressError = require('./ExpressError');
const Listing = require('../models/listing');
const Review = require('../models/review');

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.flash("error", "You must be signed in first!");
  res.redirect("/login");
}

function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.role === 'admin') return next();
  req.flash("error", "You do not have permission to access this page.");
  res.redirect("/listings");
}

function isUser(req, res, next) {
  if (req.isAuthenticated() && req.user.role === 'user') return next();
  req.flash("error", "Unauthorized access");
  res.redirect("/login");
}

const validateListing = (req, res, next) => {
  const { error } = listingSchema.validate(req.body);
  if (error) {
    const msg = error.details.map(el => el.message).join(',');
    throw new ExpressError(400, msg);
  }
  next();
};

const validateReview = (req, res, next) => {
    let { error } = reviewSchema.validate(req.body);
    if (error) {
        let errorMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errorMsg);
    } else {
        next();
    }
};

const isOwner = async (req, res, next) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing.owner.equals(req.user._id)) {
    req.flash("error", "You are not the owner of this listing");
    return res.redirect(`/listings/${req.params.id}`);
  }
  next();
};

const isAuthor = async (req, res, next) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review.author.equals(req.user._id)) {
    req.flash("error", "You are not the author of this review");
    return res.redirect(`/listings/${req.params.id}`);
  }
  next();
};

module.exports = {
  isLoggedIn,
  isAdmin,
  isUser,
  // validateListing,
  validateReview,
  isOwner,
  isAuthor
};

