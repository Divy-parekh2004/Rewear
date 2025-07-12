const mongoose = require("mongoose");

const swapSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserPoints', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserPoints', required: true },
    senderItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    receiverItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Swap', swapSchema);
