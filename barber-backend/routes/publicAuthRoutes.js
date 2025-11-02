const express = require("express");
const {
  signup,
  login,
  me,
  requestPasswordReset,
  resetPasswordWithOtp,
} = require("../controllers/publicAuthController");
const requirePublicUser = require("../middlewares/requirePublicUser");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", requirePublicUser, me);
router.post("/forgot", requestPasswordReset);
router.post("/reset", resetPasswordWithOtp);

module.exports = router;
