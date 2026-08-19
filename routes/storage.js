const fsPromises = require("fs/promises");
const path = require("path");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const USERS_FILE = path.join(__dirname, "..", "users.json");
const ORDERS_FILE = path.join(__dirname, "..", "comenzi.json");

async function readUsers() {
  try {
    const fileContent = await fsPromises.readFile(USERS_FILE, "utf-8");
    const users = JSON.parse(fileContent);
    return Array.isArray(users) ? users : [];
  } catch (error) {
    if (error.code === "ENOENT") {
      await fsPromises.writeFile(USERS_FILE, "[]", "utf-8");
      return [];
    }
    throw error;
  }
}

async function writeUsers(users) {
  await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

async function readOrders() {
  try {
    const fileContent = await fsPromises.readFile(ORDERS_FILE, "utf-8");
    const orders = JSON.parse(fileContent);
    return Array.isArray(orders) ? orders : [];
  } catch (error) {
    if (error.code === "ENOENT") {
      await fsPromises.writeFile(ORDERS_FILE, "[]", "utf-8");
      return [];
    }
    throw error;
  }
}

async function writeOrders(orders) {
  await fsPromises.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8");
}

function generateToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      surname: user.surname,
      role: user.role === "admin" ? "admin" : "client",
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function sanitizeUser(user) {
  const storedPhoto = typeof user.photo === "string" ? user.photo : "";
  const isExternalOrAbsolute =
    storedPhoto.startsWith("http://") ||
    storedPhoto.startsWith("https://") ||
    storedPhoto.startsWith("/");

  return {
    id: user.id,
    name: user.name,
    surname: user.surname,
    role: user.role === "admin" ? "admin" : "client",
    email: user.email,
    address: user.address || "",
    photo: storedPhoto
      ? isExternalOrAbsolute
        ? storedPhoto
        : `/uploads/users/${storedPhoto}`
      : "",
    createdAt: user.createdAt,
  };
}

module.exports = {
  JWT_SECRET,
  readUsers,
  writeUsers,
  readOrders,
  writeOrders,
  generateToken,
  sanitizeUser,
};
