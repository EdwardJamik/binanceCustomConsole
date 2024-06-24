const { v4: uuidv4 } = require('uuid');
const User = require("../models/user.model");
const { createSecretToken, createBinanceSecretToken} = require("../util/secretToken");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Order = require("../models/orders.model");
const Auth = require("../models/auth.model");
const {bot} = require("../bot");

module.exports.Signup = async (req, res, next) => {
    try {
        const { password, username,entree } = req.body;
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.json({ message: "Пользователь уже существует" });
        }

        const user = await User.create({ password, username });

        res.json({ message: "Пользователя зарегистрировано", success: true });
    } catch (error) {
        console.error(error);
    }
};

module.exports.Login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if(!username || !password ){
            return res.status(200).json({message:'Fill in all fields', success: false })
        }
        const user = await User.findOne({ username });

        if(!user){
            return res.status(200).json({message:'Invalid user name or password', success: false })
        }

        const auth = await bcrypt.compare(password,user.password)

        if (!auth) {
            return res.status(200).json({message:'Invalid username or password', success: false  })
        }

        const ip = req?.clientIp;

        const currentTime = new Date();
        const timeThreshold = new Date(currentTime - 3 * 60 * 1000);

        const findAuth = await Auth.findOne({
            chat_id: user?.chat_id,
            ip: ip,
            status:null,
            createdAt: { $gte: timeThreshold }
        });

        if(!findAuth){
            const generationKey = uuidv4()
            await Auth.create({chat_id:user?.chat_id, user_id:user?._id,ip,key:generationKey, status: null})

            await bot.telegram.sendMessage(user?.chat_id, 'Подтвердите авторизацию',{reply_markup: {
                    inline_keyboard: [
                        [{ text: '✅ Accept', callback_data: `accept_${String(generationKey)}` },{ text: '❌ Decline', callback_data: `decline_${String(generationKey)}` }],
                    ]
                }
            })

            res.json({success:true,key:generationKey})
        } else {
            return res.status(200).json({message:'Ожидает подтверждение по предыдущему запросу', success: false  })
        }

        // res.cookie("token", token, {
        //     httpOnly: false
        // }).status(201).json({ message: "User successfully authorized", success: true });

    } catch (error) {
        console.error(error);
    }
}

module.exports.getUserData = async (req, res, next) => {
    try {
        const { TOKEN_KEY } = process.env

        const token = req.cookies.token

        if (!token) {
            return res.json({ status: false, message: 'User not found'  })
        }
        jwt.verify(token, TOKEN_KEY, async (err, data) => {
            if (err) {
            } else {
                const user = await User.findById(data.id)
                if (user) {
                    return res.json({status: true,login:user.username, account_password:'',account_repeat_password:''});
                }
                else {
                    return res.json({status: false, message: 'User not found' })
                }
            }
        })
    } catch (error) {
        console.error(error);
    }
};

module.exports.getUserBeforePosition = async (req, res, next) => {
    try {
        const { TOKEN_KEY } = process.env

        const token = req.cookies.token

        if (!token) {
            return res.json({ status: false, message: 'User not found'  })
        }

        jwt.verify(token, TOKEN_KEY, async (err, data) => {
            if (err) {
            } else {
                const user = await User.findById(data.id)
                if (user) {
                    const ordersBefore = await Order.find({userId: String(user?._id), opened: false}).sort({updatedAt: -1})
                    const modifiedOrders = ordersBefore.map(order => {
                        const {_id, ...rest} = order.toObject();
                        return {key: _id, ...rest};
                    });
                    return res.json(modifiedOrders);
                }
                else {
                    return res.json(false)
                }
            }
        })
    } catch (error) {
        console.error(error);
    }
};

module.exports.getUserBinanceData = async (req, res, next) => {
    try {
        const { TOKEN_KEY, TOKEN_BINANCE_KEY } = process.env

        const token = req.cookies.token

        if (!token) {
            return res.json({ status: false, message: 'User not found'  })
        }

        jwt.verify(token, TOKEN_KEY, async (err, data) => {
            if (err) {
            } else {
                const user = await User.findById(data.id)
                if (user) {
                    let key_1 = ''

                    if(user.api_key)
                        jwt.verify(user.api_key, TOKEN_BINANCE_KEY, async (err, data) => {
                            if (err) {
                            } else {
                                key_1 = data
                            }
                        })

                    if(key_1 && user.api_secret_key)
                        return res.json({status: true,key_1,key_2:user.api_secret_key,chat_id:user.chat_id,binance_test: user.binance_test});
                    else
                        return res.json({status: false, message: 'Binance keys not found', key_1:'' })
                }
                else {
                    return res.json({status: false, message: 'User not found' })
                }
            }
        })
    } catch (error) {
        console.error(error);
    }
};

module.exports.ChangeAccountData = async (req, res, next) => {
    try {
        const { TOKEN_KEY } = process.env

        const { login, account_password, account_repeat_password } = req.body;
        const token = req.cookies.token

        if (!token) {
            return res.json({ status: false, message: 'User not found' })
        }
        jwt.verify(token, TOKEN_KEY, async (err, data) => {
            if (err) {

            } else {
                const user = await User.findById(data.id)
                if (user) {
                    if(login === '' || login === null)
                        return res.json({ message: "Не указан новый логин", success: false });
                    if(account_password === '' || account_password === null)
                        return res.json({ message: "Не указан новый пароль", success: false });
                    if(login && account_password) {
                        const newPassword = await bcrypt.hash(account_password, 12);
                        const existingUser = await User.updateOne({_id: data.id}, {
                            username: login,
                            password: newPassword
                        });
                        res.clearCookie('token')
                        return res.json({status: true, message: "Login/Password successfully changed", success: true});

                    }
                }
                else {
                    return res.json({status: false, message: 'User not found'})
                }
            }
        })
    } catch (error) {
        console.error(error);
    }
};

module.exports.ChangeAccountBinance = async (req, res, next) => {
    try {
        const { TOKEN_KEY } = process.env

        const { key_1, key_2, chat_id, binance_test } = req.body;
        const token = req.cookies.token

        if (!token) {
            return res.json({ status: false, message: 'User not found' })
        }
        jwt.verify(token, TOKEN_KEY, async (err, data) => {
            if (err) {
            } else {
                const user = await User.findById(data.id)
                if (user) {
                    if(key_1 === '' || key_1 === null)
                        return res.json({ message: "Error, enter binance api key", success: false });
                    if(key_2 === '' || key_2 === null)
                        return res.json({ message: "Error, enter binance api secret key", success: false });
                    if(chat_id === '' || chat_id === null)
                        return res.json({ message: "Error, enter telegram chat_id", success: false });

                    const api_key = await createBinanceSecretToken(key_1)
                    const api_secret_key = await createBinanceSecretToken(key_2)

                    if(key_1 && key_2 && chat_id) {
                        const existingUser = await User.updateOne({_id: data.id}, {
                            api_key,
                            api_secret_key,
                            chat_id: chat_id,
                            binance_test: binance_test
                        });
                        return res.json({status: true, message: "Data has been successfully updated", success: true});
                    }
                }
                else {
                    return res.json({status: false, message: 'User not found'})
                }
            }
        })
    } catch (error) {
        console.error(error);
    }
};

module.exports.Logout = async (req, res, next) => {
    try {
        res.clearCookie('token')
        res.status(201).json({ message: "User logged in successfully", success: true });

    } catch (error) {
        console.error(error);
    }
}
