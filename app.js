const express = require("express");
const cors = require("cors");
const nhaxuatbanRouter = require("./app/routes/nhaxuatban.route");
const sachRouter = require("./app/routes/sach.route");
const docgiaRouter = require("./app/routes/docgia.route");
const nhanvienRouter = require("./app/routes/nhanvien.route");
const authRouter = require("./app/routes/auth.route");
const muonsachRouter = require("./app/routes/muonsach.route");
const thongkeRouter = require("./app/routes/thongke.route");
const ApiError = require("./app/api-error");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "Welcome to library management application." });
});

app.use("/api/nhaxuatban", nhaxuatbanRouter);
app.use("/api/sach", sachRouter);
app.use("/api/docgia", docgiaRouter);
app.use("/api/nhanvien", nhanvienRouter);
app.use("/api/auth", authRouter);
app.use("/api/muonsach", muonsachRouter);
app.use("/api/thongke", thongkeRouter);

// Xử lý 404
app.use((req, res, next) => {
    return next(new ApiError(404, "Resource not found"));
});

// Middleware xử lý lỗi (đặt cuối cùng)
app.use((err, req, res, next) => {
    return res.status(err.statusCode || 500).json({
        message: err.message || "Internal Server Error",
    });
});

module.exports = app;