const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("./storage");

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Autentificare necesara." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Token invalid sau expirat." });
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Nu ai permisiunea necesara pentru aceasta actiune." });
    }

    return next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
};
