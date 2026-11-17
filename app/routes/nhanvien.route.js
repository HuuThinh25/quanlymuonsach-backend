const express = require("express");
const nhanvien = require("../controllers/nhanvien.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.route("/")
    .get(requireAuth, requireRole("nhanvien"), nhanvien.findAll)
    .post(requireAuth, requireRole("nhanvien"), nhanvien.create);

router.route("/:id")
    .get(requireAuth, requireRole("nhanvien"), nhanvien.findOne)
    .put(requireAuth, requireRole("nhanvien"), nhanvien.update)
    .delete(requireAuth, requireRole("nhanvien"), nhanvien.delete);

module.exports = router;