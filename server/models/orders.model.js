const mongoose = require("mongoose");

const ordersSchema = new mongoose.Schema({
    positionsId: {
        type: String,
        unique: true
    },
    ordersId: {
        type: Object,
    }
})

module.exports = mongoose.model("orders", ordersSchema);
