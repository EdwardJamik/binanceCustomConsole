const mongoose = require("mongoose");

const socketPriceSchema = new mongoose.Schema({
    symbol: {
        type: String,
        unique: true
    },
    user: {
        type: Array,
    },
    updatedAt: {
        type: Date,
        default: new Date(),
    },
    createdAt: {
        type: Date,
        default: new Date(),
    },
})

module.exports = mongoose.model("SocketPrice", socketPriceSchema);
