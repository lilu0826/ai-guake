import express from "express";
import compression from "compression";
import { upsertUserData, getAllData, deleteUserData } from "./db.js";
import { WebSocketServer } from "ws";
import http from "http";
import { start } from "./engine.js";

process.on("uncaughtException", function (err) {
    console.log("uncaughtException", err.message);
});
const clientSet = new Set();

const originalConsoleLog = console.log;
console.log = function (message, ...args) {
    const time = new Date().toLocaleString("zh-CN");
    originalConsoleLog(`[${time}] ${message}`, ...args);

    let info =
        `[${time}] ${message}\t` +
        args.map((arg) => JSON.stringify(arg, null, 2)).join("\t") +
        "\n";

    clientSet.forEach((client) => {
        client.send(info);
    });
};

const app = express();
app.use(express.urlencoded({ extended: true }))
const server = http.createServer(app);
// 挂载 WebSocket 服务器
const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
    clientSet.add(ws);
    ws.on("close", () => {
        clientSet.delete(ws);
    });
});

app.use(compression());
app.use("/img", express.static("img"));

app.set("views", "./");
app.set("view engine", "ejs");

//获取状态
app.get("/", async function (req, res) {
    const status = req.query.status || "all";
    const fileterMap = {
        all: () => true,
        finish: (item) => item.status == "学习完成",
        unfinish: (item) => item.status != "学习完成",
    };
    const data = await getAllData();
    res.render("index", {
        total: data.length,
        data: data.filter(fileterMap[status] || fileterMap.all),
    });
});

app.get("/delete", async function (req, res) {
    await deleteUserData(req.query.username);
    res.redirect(req.headers.referer);
});

//直接重定向登录，由后端跟踪登录状态
app.post("/login", async function (req, res) {
    if (req.body.username && req.body.password) {
        await upsertUserData({
            username: req.body.username,
            password: req.body.password,
        });
        start(req.body.username,req.body.password)
    }
    res.redirect(req.headers.referer);
});

app.get("/start", async function (req, res) {
    const data = await getAllData();
    const item = data.find(item => item.username === req.query.username);
    start(item.username,item.password)
    res.redirect(req.headers.referer);
});

server.listen(9090, function () {
    var port = server.address().port;
    console.log("应用实例，访问地址为 http://%s:%s", "localhost", port);
});
