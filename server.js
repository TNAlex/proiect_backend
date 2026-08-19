require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const path = require("path");

const clothesRoutes = require("./routes/clothesRoutes");
const authRoutes = require("./routes/authRoutes");
const usersRoutes = require("./routes/usersRoutes");
const ordersRoutes = require("./routes/ordersRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const port = process.env.PORT || 3000;

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) {
            callback(null, true);
            return;
        }

        const isLocalhost = /^https?:\/\/localhost:\d+$/.test(origin);
        if (isLocalhost) {
            callback(null, true);
            return;
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    optionsSuccessStatus: 204,
    methods: ["GET", "POST", "PUT", "DELETE"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "5mb" }));

app.use("/clothes", clothesRoutes);
app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/orders", ordersRoutes);

app.use(errorHandler);

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});