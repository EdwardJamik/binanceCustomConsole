const mongoose = require("mongoose");

const loginSchema = new mongoose.Schema({
    chat_id: {
        type: String
    },
    user_id: {
        type: String
    },
    ip: {
        type: String
    },
    key: {
        type: String
    },
    status: {
        type: Boolean,
        default:null
    },
    updatedAt: {
        type: Date,
    },
    createdAt: {
        type: Date,
    },
},{ timestamps: true })

module.exports = mongoose.model("login", loginSchema);