const express = require("express");
const path = require("path");
const cors = require("cors");
const compression = require("compression");

const app = express();

// ===== Middleware =====
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(compression());
app.use(express.static(path.join(__dirname, "public")));

// ===== API INFO ROUTE =====
app.get("/api", (req, res) => {
    res.json({
        name: "AuthAPI v3 - Production",
        version: "3.5.0",
        status: "online",
        timestamp: new Date().toISOString(),
        features: [
            "Multi-user authentication",
            "Key verification",
            "Premium system",
            "AI endpoints",
            "Auto backup",
            "Device tracking",
            "Anti-crash protection"
        ]
    });
});

// ===== ROOT ROUTE =====
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
