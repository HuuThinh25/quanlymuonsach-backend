const express = require("express");
const docgia = require("../controllers/docgia.controller");
const { requireAuth, requireRole, requireQuanLy } = require("../middlewares/auth.middleware");

const router = express.Router();

router.route("/")
    .get(requireAuth, requireRole("nhanvien"), docgia.findAll);

// Route cụ thể phải đứng trước /:id
router.route("/:id/xoa-vi-pham")
    .put(requireAuth, requireRole("nhanvien"), docgia.xoaViPham);

router.route("/:id")
    .get(requireAuth, requireRole("nhanvien"), docgia.findOne)
    .delete(requireAuth, requireRole("nhanvien"), requireQuanLy, docgia.delete);

module.exports = router;