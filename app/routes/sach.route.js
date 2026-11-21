const express = require("express");
const sach = require("../controllers/sach.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.route("/")
    .get(sach.findAll)
    .post(requireAuth, requireRole("nhanvien"), sach.create);

router.route("/:id")
    .get(sach.findOne)
    .put(requireAuth, requireRole("nhanvien"), sach.update)
    .delete(requireAuth, requireRole("nhanvien"), sach.delete);

module.exports = router;