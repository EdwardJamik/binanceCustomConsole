const { Signup,Login, Logout} = require("../controllers/auth.controller");
const {userVerification} = require("../middlewares/authMiddleware");
const {ChangeAccountData, getUserData, ChangeAccountBinance, getUserBinanceData} = require("../controllers/auth.controller");
const router = require("express").Router();

router.post("/signup", Signup);
router.post('/login', Login);
router.post('/logout', Logout);
router.post('/changeAccountData', ChangeAccountData)
router.post('/changeAccountBinance', ChangeAccountBinance)
router.post('/getUserData', getUserData)
router.post('/getUserBinanceData', getUserBinanceData)


router.post('/',userVerification)

module.exports = router;