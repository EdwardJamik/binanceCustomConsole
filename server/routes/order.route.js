
const {createOrder} = require("../controllers/order.controller");
const router = require("express").Router();


router.post("/createOrder", createOrder);

module.exports = router;