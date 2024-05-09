const {getCurrency, getCurrencyLeverage} = require("../controllers/info.controller");
const router = require("express").Router();


router.post("/getCurrency", getCurrency);
router.post("/getLeverage", getCurrencyLeverage);

module.exports = router;