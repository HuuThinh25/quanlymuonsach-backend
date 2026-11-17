const express = require("express");
const nhaxuatban = require("../controllers/nhaxuatban.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.route("/")
    .get(requireAuth, nhaxuatban.findAll)
    .post(requireAuth, requireRole("nhanvien"), nhaxuatban.create);

router.route("/:id")
    .get(requireAuth, nhaxuatban.findOne)
    .put(requireAuth, requireRole("nhanvien"), nhaxuatban.update)
    .delete(requireAuth, requireRole("nhanvien"), nhaxuatban.delete);

module.exports = router;