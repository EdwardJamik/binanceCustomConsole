const mongoose = require("mongoose");

const preSettingSchema = new mongoose.Schema({
    user_id: {
        type: String
    },
    name: {
        type: String
    },
    adjustLeverage: {
        type: Number
    },
    takeProfit: {
        type: Object
    },
    trailing: {
        type: Object
    },
    macd: {
        type: Object
    },
    withoutLoss: {
        type: Object
    },
    amount: {
        type: Number
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

module.exports = mongoose.model("presetting", preSettingSchema);
