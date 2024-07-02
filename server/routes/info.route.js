const {getCurrency, getCurrencyLeverage, createNewCurrency, getEditorCurrency, getFavoriteList} = require("../controllers/info.controller");
const router = require("express").Router();


router.post("/getCurrency", getCurrency);
router.post("/getLeverage", getCurrencyLeverage);
router.post("/getEditorCurrency", getEditorCurrency);
router.post("/getFavoriteList", getFavoriteList);
router.post("/createNewCurrency", createNewCurrency);

module.exports = router;