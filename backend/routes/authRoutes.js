const express = require("express");
const {
  register,
  login,
  changePassword,
  getNotifications,
  getCurrentUser,
  clearNotifications,
  logoutAllDevices,
  deleteAccount,
  listUsers,
  deleteUser,
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/change-password", authMiddleware, changePassword);
router.post("/notifications/clear", authMiddleware, clearNotifications);
router.post("/logout-all", authMiddleware, logoutAllDevices);
router.delete("/account", authMiddleware, deleteAccount);
router.get("/notifications", authMiddleware, getNotifications);
router.get("/me", authMiddleware, getCurrentUser);

// Admin: manage users
router.get("/admin/users", authMiddleware, listUsers);
router.delete("/admin/users/:id", authMiddleware, deleteUser);

module.exports = router;
