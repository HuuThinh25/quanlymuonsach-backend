const jwt = require("jsonwebtoken");
const config = require("../config");
const ApiError = require("../api-error");

// Middleware xác thực: kiểm tra token JWT trong header Authorization
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new ApiError(401, "Vui lòng đăng nhập để tiếp tục"));
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, config.auth.jwtSecret);
        req.user = { id: decoded.id, ma: decoded.ma, role: decoded.role };
        return next();
    } catch (error) {
        return next(new ApiError(401, "Token không hợp lệ hoặc đã hết hạn"));
    }
};

// Middleware phân quyền: kiểm tra vai trò của người dùng
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new ApiError(403, "Bạn không có quyền truy cập"));
        }
        return next();
    };
};

module.exports = { requireAuth, requireRole };