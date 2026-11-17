const express = require("express");
const docgia = require("../controllers/docgia.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.route("/")
    .get(requireAuth, requireRole("nhanvien"), docgia.findAll)
    .post(requireAuth, requireRole("nhanvien"), docgia.create);

// Route cụ thể phải đứng trước /:id
router.route("/:id/xoa-vi-pham")
    .put(requireAuth, requireRole("nhanvien"), docgia.xoaViPham);

router.route("/:id")
    .get(requireAuth, requireRole("nhanvien"), docgia.findOne)
    .put(requireAuth, requireRole("nhanvien"), docgia.update)
    .delete(requireAuth, requireRole("nhanvien"), docgia.delete);

module.exports = router;