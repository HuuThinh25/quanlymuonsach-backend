const config = {
    app: {
        port: process.env.PORT || 3000,
    },
    db: {
        uri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/quanlymuonsach",
    },
    auth: {
        // Khóa ký JWT, đọc từ biến môi trường (có giá trị mặc định chỉ để phát triển)
        jwtSecret: process.env.JWT_SECRET || "dev-secret-ct449-quanlymuonsach",
        jwtExpires: "8h",
    },
};

module.exports = config;