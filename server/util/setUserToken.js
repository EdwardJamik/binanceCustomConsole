const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const {TOKEN_KEY} = process.env
const util = require('util');
const jwtVerifyAsync = util.promisify(jwt.verify);

async function setUserToken(token, id) {
    try {
        const data = await jwtVerifyAsync(token, TOKEN_KEY);

        if (data) {
            await User.updateOne({ _id: data.id }, { token: id });
            const user = await User.findOne({ _id: data.id });
            return user;
        } else {
            return false;
        }
    } catch (e) {
        console.error(e);
        return false;
    }
}


exports.setUserToken = setUserToken