const express = require("express");
const thongke = require("../controllers/thongke.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/tong-quan", requireAuth, requireRole("nhanvien"), thongke.tongQuan);

module.exports = router;