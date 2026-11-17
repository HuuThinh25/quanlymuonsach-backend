const express = require("express");
const auth = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/login", auth.login);
router.get("/me", requireAuth, auth.me);
router.put("/doi-mat-khau", requireAuth, auth.doiMatKhau);

module.exports = router;