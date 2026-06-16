const express = require("express");
const { register, login, getNotifications, getCurrentUser, listUsers, deleteUser } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/notifications", authMiddleware, getNotifications);
router.get("/me", authMiddleware, getCurrentUser);

// Admin: manage users
router.get("/admin/users", authMiddleware, listUsers);
router.delete("/admin/users/:id", authMiddleware, deleteUser);

module.exports = router;
