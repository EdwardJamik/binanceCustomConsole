const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const {TOKEN_KEY} = process.env

function setUserToken(token, socket) {
    try {
        return new Promise((resolve, reject) => {
            jwt.verify(token, TOKEN_KEY, async (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    try {
                        await User.updateOne({_id: data?.id}, {token:socket.id});
                        const user = await User.findOne({_id: data?.id});
                        resolve(user);
                    } catch (error) {
                        console.error(error)
                        reject(false);
                    }
                }
            });
        });
    } catch (e){
        console.error(e)
    }
}


exports.setUserToken = setUserToken