const express = require("express");
const muonsach = require("../controllers/muonsach.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();

// Route cụ thể phải đứng trước /:id
router.post("/yeu-cau", requireAuth, requireRole("docgia"), muonsach.yeuCau);
router.get("/cua-toi", requireAuth, requireRole("docgia"), muonsach.cuaToi);

router.route("/")
    .get(requireAuth, requireRole("nhanvien"), muonsach.findAll)
    .post(requireAuth, requireRole("nhanvien"), muonsach.create);

router.put("/:id/duyet", requireAuth, requireRole("nhanvien"), muonsach.duyet);
router.put("/:id/tu-choi", requireAuth, requireRole("nhanvien"), muonsach.tuChoi);
router.put("/:id/tra", requireAuth, requireRole("nhanvien"), muonsach.tra);

module.exports = router;
