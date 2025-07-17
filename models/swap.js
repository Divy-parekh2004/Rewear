const mongoose = require("mongoose");
const { Schema } = mongoose;

// Define the schema for a swap
const swapSchema = new Schema({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  senderItemId: {
    type: Schema.Types.ObjectId,
    ref: "Listing",
    required: true
  },
  receiverItemId: {
    type: Schema.Types.ObjectId,
    ref: "Listing",
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  }
}, {
  timestamps: true  // ✅ Automatically adds createdAt and updatedAt
});

// Export the model
module.exports = mongoose.model("Swap", swapSchema);
