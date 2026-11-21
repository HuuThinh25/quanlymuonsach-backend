const express = require("express");
const auth = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/login", auth.login);
router.post("/dang-ky", auth.dangKy);
router.post("/quen-mat-khau", auth.quenMatKhau);
router.post("/dat-lai-mat-khau", auth.datLaiMatKhau);
router.get("/me", requireAuth, auth.me);
router.put("/ho-so", requireAuth, auth.hoSo);
router.put("/doi-mat-khau", requireAuth, auth.doiMatKhau);

module.exports = router;