const express = require("express");
const docgia = require("../controllers/docgia.controller");

const router = express.Router();

router.route("/")
    .get(docgia.findAll)
    .post(docgia.create);

// Route cụ thể phải đứng trước /:id
router.route("/:id/xoa-vi-pham")
    .put(docgia.xoaViPham);

router.route("/:id")
    .get(docgia.findOne)
    .put(docgia.update)
    .delete(docgia.delete);

module.exports = router;
