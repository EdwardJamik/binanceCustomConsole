const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema({
    socketPrice: {
        type: Object,
        default: {
            "BTCUSDT":{},
            "ETHUSDT":{}
        }
    },
    socketPriceWithoutLoss: {
        type: Object,
        default: {
            "BTCUSDT":{},
            "ETHUSDT":{}
        }
    },
    socketMacd: {
        type: Boolean,
        default: {
            "BTCUSDT_15m":{},
            "ETHUSDT_15m":{}
        }
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

module.exports = mongoose.model("Settings", settingSchema);
