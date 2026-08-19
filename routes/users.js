const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const { authenticateToken, authorizeRoles } = require("./middleware");
const { generateToken, sanitizeUser, readUsers, writeUsers } = require("./storage");

const router = express.Router();
const UPLOADS_DIR = path.join(__dirname, "..", "uploads", "users");
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    require("fs").mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeExtension = extension || ".jpg";
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Tipul fisierului nu este acceptat."));
      return;
    }

    cb(null, true);
  },
});

router.post("/auth/register", upload.single("photo"), async (req, res) => {
  const { name, surname, email, password, repeatPassword } = req.body;

  if (
    !name ||
    !surname ||
    !email ||
    !password ||
    !repeatPassword ||
    typeof name !== "string" ||
    typeof surname !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof repeatPassword !== "string"
  ) {
    return res.status(400).json({ message: "Date invalide." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Parola trebuie sa aiba minim 6 caractere." });
  }

  if (password !== repeatPassword) {
    return res.status(400).json({ message: "Parolele nu coincid." });
  }

  if (!req.file) {
    return res.status(400).json({ message: "Poza este obligatorie." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const users = await readUsers();
  const existingUser = users.find((user) => user.email === normalizedEmail);

  if (existingUser) {
    return res.status(409).json({ message: "Exista deja un cont cu acest email." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now(),
    name: name.trim(),
    surname: surname.trim(),
    email: normalizedEmail,
    passwordHash,
    photo: req.file.filename,
    role: "client",
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  await writeUsers(users);
  const token = generateToken(newUser);

  return res.status(201).json({
    message: "Cont creat cu succes.",
    token,
    user: sanitizeUser(newUser),
  });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Emailul si parola sunt obligatorii." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const users = await readUsers();
  const user = users.find((item) => item.email === normalizedEmail);
// console.log("User found:", user);
  if (!user) {
    return res.status(401).json({ message: "Email sau parola invalide." });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    return res.status(401).json({ message: "Email sau parola invalide." });
  }

  const token = generateToken(user);

  return res.json({
    message: "Autentificare reusita.",
    token,
    user: sanitizeUser(user),
  });
});

router.get("/auth/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/users", authenticateToken, authorizeRoles("admin"), async (_req, res) => {
  try {
    const users = await readUsers();
    return res.json(users.map(sanitizeUser));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Eroare interna de server." });
  }
});

router.get("/users/:id", authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "Id utilizator invalid." });
    }

    if (req.user.role !== "admin" && Number(req.user.sub) !== id) {
      return res.status(403).json({ message: "Poti vedea doar propriul profil." });
    }

    const users = await readUsers();
    const user = users.find((item) => item.id === id);

    if (!user) {
      return res.status(404).json({ message: "Utilizatorul nu a fost gasit." });
    }

    return res.json(sanitizeUser(user));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Eroare interna de server." });
  }
});

router.put("/users/:id", authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, surname, email, address } = req.body;

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "Id utilizator invalid." });
    }

    if (req.user.role !== "admin" && Number(req.user.sub) !== id) {
      return res.status(403).json({ message: "Poti edita doar propriul profil." });
    }

    if (
      !name ||
      !surname ||
      !email ||
      !address ||
      typeof name !== "string" ||
      typeof surname !== "string" ||
      typeof email !== "string" ||
      typeof address !== "string"
    ) {
      return res.status(400).json({ message: "Date invalide." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = await readUsers();
    const index = users.findIndex((item) => item.id === id);

    if (index === -1) {
      return res.status(404).json({ message: "Utilizatorul nu a fost gasit." });
    }

    const duplicatedEmail = users.find(
      (item) => item.id !== id && item.email === normalizedEmail,
    );
    if (duplicatedEmail) {
      return res.status(409).json({ message: "Exista deja un cont cu acest email." });
    }

    users[index] = {
      ...users[index],
      name: name.trim(),
      surname: surname.trim(),
      email: normalizedEmail,
      address: address.trim(),
    };

    await writeUsers(users);
    return res.json(sanitizeUser(users[index]));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Eroare interna de server." });
  }
});

router.delete("/users/:id", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "Id utilizator invalid." });
    }

    const users = await readUsers();
    const index = users.findIndex((item) => item.id === id);

    if (index === -1) {
      return res.status(404).json({ message: "Utilizatorul nu a fost gasit." });
    }

    users.splice(index, 1);
    await writeUsers(users);
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Eroare interna de server." });
  }
});

module.exports = router;
