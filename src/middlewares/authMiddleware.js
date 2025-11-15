const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config/jwt");

function authMiddleware(req, res, next) {
  const authHeader =
    req.headers.authorization ||
    req.headers.Authorization ||
    req.headers["authorization"];

  console.log("AUTH HEADER:", authHeader); // 👉 tambahkan sementara

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided", data: null });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT ERROR:", err.message);
    return res
      .status(401)
      .json({ success: false, message: "Invalid token", data: null });
  }
}


module.exports = authMiddleware;
