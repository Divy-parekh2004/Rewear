const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserPoints', required: true },
    title: { type: String, required: true },
    description: String,
    size: String,
    condition: String,
    imageUrl: String,
    status: { type: String, default: 'available' }
});

module.exports = mongoose.model('Item', itemSchema);
