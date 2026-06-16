const path = require("path");
const readline = require("readline");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const askQuestion = (prompt, mask = false) => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    if (mask) {
      rl.stdoutMuted = true;
      rl._writeToOutput = function (stringToWrite) {
        if (rl.stdoutMuted) {
          process.stdout.write("*");
        } else {
          process.stdout.write(stringToWrite);
        }
      };
    }

    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
};

const run = async () => {
  try {
    console.log("=== Admin User Creation ===\n");
    const name = await askQuestion("Admin Name: ");
    const email = await askQuestion("Admin Email: ");
    const password = await askQuestion("Admin Password: ", true);
    const confirmPassword = await askQuestion("Confirm Password: ", true);

    if (!name || !email || !password || !confirmPassword) {
      console.error("Error: All fields are required.");
      process.exit(1);
    }

    if (password !== confirmPassword) {
      console.error("Error: Passwords do not match.");
      process.exit(1);
    }

    await connectDB();

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      console.error("Error: A user with that email already exists.");
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const adminUser = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "admin",
      lastLogin: null,
    });

    console.log(`\nAdmin user created successfully: ${adminUser.name} <${adminUser.email}>`);
    console.log("Role: admin");
    process.exit(0);
  } catch (error) {
    console.error("Failed to create admin user:", error.message || error);
    process.exit(1);
  }
};

run();
