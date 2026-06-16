const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { getPanchangData, parseQueryDate } = require("../utils/panchangCalculations");

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("Missing JWT_SECRET in environment variables.");
  }

  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const buildNotificationResponse = (notifications) => {
  return notifications.map((notification) => {
    const title = notification.title
      || (notification.message.includes(":") ? notification.message.split(":")[0].trim() : "Notification");

    return {
      id: notification._id,
      user: title,
      message: notification.message,
      time: notification.createdAt.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  });
};

const getDisplayTithi = (lang, tithiName) => {
  const normalized = (lang || "").toLowerCase();

  if (normalized === "telugu") {
    const teluguMap = {
      Dwitiya: "ద్వితీయ",
      Tritiya: "త్రితీయ",
      Chaturthi: "చతుర్థి",
      Panchami: "పంచమీ",
      Shashthi: "షష్ఠి",
      Saptami: "సప్తమీ",
      Ashtami: "అష్టమీ",
      Navami: "నవమీ",
      Dashami: "దశమీ",
      Ekadashi: "ఏకాదశి",
      Dwadashi: "ద్వాదశి",
      Trayodashi: "త్రయోదశి",
      Chaturdashi: "చతురదశి",
      Purnima: "పూర్ణిమ",
      Amavasya: "అమావాస్య",
    };

    return teluguMap[tithiName] || tithiName;
  }

  return tithiName;
};

const buildVarjyamNotificationMessage = (date, varjyamDetails) => {
  const formatted = varjyamDetails.map((item) => {
    const start = item.start || "unknown";
    const end = item.end ? ` to ${item.end}` : "";
    return `${item.name}: ${start}${end}`;
  });

  return `Varjyam update for ${date}: ${formatted.join("; ")}`;
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body || {};

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ error: "Email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Always create registered users as a normal user account.
    // Admin accounts must be created manually via the backend admin creation script.
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
      lastLogin: new Date(),
    });

    await Notification.create({
      user: null,
      type: "admin",
      title: "New User Registered",
      message: `New user registered: ${user.name}`,
      eventDate: new Date().toISOString().slice(0, 10),
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("Register error:", error?.stack || error);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    user.lastLogin = new Date();
    await user.save();

    await Notification.create({
      user: null,
      type: "admin",
      title: "User Login",
      message: `User logged in: ${user.name}`,
      eventDate: new Date().toISOString().slice(0, 10),
    });

    createLoginVarjyamNotification(user).catch((error) => {
      console.warn("User login notification scheduling failed:", error.message);
    });

    const token = generateToken(user);

    res.json({
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("Login error:", error?.stack || error);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const role = req.user.role || "user";
    const query = role === "admin"
      ? { type: { $in: ["admin", "activity", "system"] } }
      : { user: req.user._id, type: "user" };

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(buildNotificationResponse(notifications));
  } catch (error) {
    console.error("Get notifications error:", error.message);
    res.status(500).json({ error: "Unable to fetch notifications." });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    res.json({ user: { name: req.user.name, email: req.user.email, role: req.user.role, lastLogin: req.user.lastLogin } });
  } catch (error) {
    console.error("Get current user error:", error.message);
    res.status(500).json({ error: "Unable to fetch current user." });
  }
};

// Admin: List all users
exports.listUsers = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden. Admins only." });
    }

    const users = await User.find()
      .select("name email role createdAt lastLogin")
      .sort({ createdAt: -1 })
      .lean();

    const payload = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
    }));

    res.json(payload);
  } catch (error) {
    console.error("List users error:", error.message || error);
    res.status(500).json({ error: "Unable to fetch users." });
  }
};

// Admin: Delete a user by id
exports.deleteUser = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden. Admins only." });
    }

    const userId = req.params.id;
    if (!userId) return res.status(400).json({ error: "User id is required." });

    // Prevent self-delete
    if (req.user._id.toString() === userId) {
      return res.status(400).json({ error: "Cannot delete your own account." });
    }

    const userToDelete = await User.findById(userId);
    if (!userToDelete) return res.status(404).json({ error: "User not found." });

    // Prevent deleting the last admin
    if (userToDelete.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({ error: "Cannot delete the last admin user." });
      }
    }

    await User.deleteOne({ _id: userId });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error.message || error);
    res.status(500).json({ error: "Unable to delete user." });
  }
};

const createLoginVarjyamNotification = async (user) => {
  try {
    const now = new Date();
    const queryDate = now.toISOString().slice(0, 10);
    const queryTime = now.toTimeString().slice(0, 5);
    const parsedDate = parseQueryDate(queryDate);

    const data = getPanchangData(parsedDate, queryTime);
    const tithiData = data?.tithi || null;
    const varjyamDetails = Array.isArray(data?.varjyamDetails) ? data.varjyamDetails : [];

    const tithiLabel = tithiData ? getDisplayTithi("Telugu", tithiData.name) : null;
    const tithiMessage = tithiLabel
      ? `Today’s Tithi: ${tithiLabel}`
      : "Today’s Tithi data is unavailable.";
    const varjyamMessage = varjyamDetails.length > 0
      ? buildVarjyamNotificationMessage(queryDate, varjyamDetails)
      : "Varjyam details are unavailable.";

    const message = `${tithiMessage} ${varjyamMessage}`;

    await Notification.create({
      user: user._id,
      type: "user",
      title: "Login Varjyam update",
      message,
      eventDate: queryDate,
      meta: {
        tithi: tithiData,
        varjyamDetails,
      },
    });
  } catch (error) {
    console.warn("Login varjyam notification failed:", error?.message || error);
  }
};
