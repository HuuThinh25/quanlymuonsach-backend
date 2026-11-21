const express = require("express");
const nhanvien = require("../controllers/nhanvien.controller");
const { requireAuth, requireRole, requireQuanLy } = require("../middlewares/auth.middleware");

const router = express.Router();

router.route("/")
    .get(requireAuth, requireRole("nhanvien"), requireQuanLy, nhanvien.findAll)
    .post(requireAuth, requireRole("nhanvien"), requireQuanLy, nhanvien.create);

router.route("/:id")
    .get(requireAuth, requireRole("nhanvien"), requireQuanLy, nhanvien.findOne)
    .put(requireAuth, requireRole("nhanvien"), requireQuanLy, nhanvien.update)
    .delete(requireAuth, requireRole("nhanvien"), requireQuanLy, nhanvien.delete);

module.exports = router;