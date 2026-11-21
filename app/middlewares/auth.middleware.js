const jwt = require("jsonwebtoken");
const config = require("../config");
const ApiError = require("../api-error");
const MongoDB = require("../utils/mongodb.util");
const NhanVienService = require("../services/nhanvien.service");

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

// Middleware chỉ QuanLy: đọc ChucVu từ database ở mỗi lần gọi
const requireQuanLy = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== "nhanvien") {
            return next(new ApiError(403, "Bạn không có quyền truy cập"));
        }
        const service = new NhanVienService(MongoDB.client);
        const nv = await service.findById(req.user.id);
        if (!nv || nv.ChucVu !== "QuanLy") {
            return next(new ApiError(403, "Chỉ Quản lý mới có quyền này"));
        }
        return next();
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi kiểm tra quyền quản lý"));
    }
};

module.exports = { requireAuth, requireRole, requireQuanLy };