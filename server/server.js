const express = require("express");
const app = express();

const authRoute = require('./routes/auth.route');
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const cors = require("cors");
const SocketIOServer = require("./webSocket/websocket");
const SOCKET_PORT = process.env.SOCKET_PORT || 5030;
const requestIp = require('request-ip');
const path = require("path");
const fs = require("fs");

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cookieParser());

app.use(cors({
    origin: true,
    credentials: true,
}));
app.use(requestIp.mw());

app.get('/api/v1/logs/:id', (req, res) => {
    const id = req.params.id;
    const logFile = path.join(__dirname, 'logs', `position-${id}.log`);

    fs.readFile(logFile, 'utf8', (err, data) => {
        if (err) {
            console.error('Помилка при читанні лог-файлу', err);
            return res.status(500).send('Помилка при читанні логів');
        }
        res.send(`<pre>${data}</pre>`);
    });
});

const socketServer = new SocketIOServer(SOCKET_PORT,app);

app.use('/api/v1/', authRoute);
app.use("/api/v1/info", require("./routes/info.route.js"));
app.use("/api/v1/order", require("./routes/order.route.js"));
app.use("*", (req, res) => res.status(404).json({ error: "not found"}));

module.exports.app = app;
exports.socketServer = socketServer