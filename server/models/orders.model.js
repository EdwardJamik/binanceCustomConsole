const mongoose = require("mongoose");

const ordersSchema = new mongoose.Schema({
    positionsId: {
        type: String,
        unique: true
    },
    ordersId: {
        type: Object,
    },
    leverage:{
        type:String
    },
    commission:{
        type: Number
    },
    positionData: {
        type: Object,
    },
    ClosePositionData: {
        type: Object,
    },
    orderData: {
        type: Object,
    },
    userId: {
        type: String,
    },
    openedConfig: {
        type: Object,
    },
    currency: {
        type: String,
    },
    opened: {
        type: Boolean,
    },
    startPrice: {
        type: String,
    },
    updatedAt: {
        type: Date,
    },
    createdAt: {
        type: Date,
    },
},{timestamps:true})

module.exports = mongoose.model("orders", ordersSchema);
