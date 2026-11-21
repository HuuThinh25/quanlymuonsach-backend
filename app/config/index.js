require("dotenv").config();

const config = {
    app: {
        port: process.env.PORT || 3000,
        clientUrl: process.env.CLIENT_URL || "http://localhost:3001",
    },
    db: {
        uri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/quanlymuonsach",
    },
    auth: {
        jwtSecret: process.env.JWT_SECRET || "dev-secret-ct449-quanlymuonsach",
        jwtExpires: "8h",
    },
    rules: {
        maxViolations: 3,
        maxBorrowAtOnce: 5,
        borrowDays: 14,
        lowStock: 2,
    },
    reset: {
        tokenMinutes: 30,
        minIntervalSeconds: 60,
    },
    mail: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.MAIL_FROM,
    },
};

module.exports = config;
