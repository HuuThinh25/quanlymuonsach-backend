const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config");
const MongoDB = require("../utils/mongodb.util");
const ApiError = require("../api-error");
const AuthService = require("../services/auth.service");

// Đăng nhập: trả token và thông tin người dùng (không có Password)
exports.login = async (req, res, next) => {
    const { role, ma, password } = req.body || {};

    if (role !== "nhanvien" && role !== "docgia") {
        return next(new ApiError(400, "Vai trò không hợp lệ"));
    }
    if (!ma || !password) {
        return next(new ApiError(400, "Vui lòng nhập mã và mật khẩu"));
    }

    try {
        const account = await AuthService.findAccountByMa(MongoDB.client, role, ma);

        // Sai mã, sai mật khẩu hoặc sai role đều trả cùng một thông báo
        if (!account) {
            return next(new ApiError(401, "Sai mã hoặc mật khẩu"));
        }

        const isMatch = await bcrypt.compare(password, account.Password || "");
        if (!isMatch) {
            return next(new ApiError(401, "Sai mã hoặc mật khẩu"));
        }

        const token = jwt.sign(
            { id: String(account._id), ma, role },
            config.auth.jwtSecret,
            { expiresIn: config.auth.jwtExpires }
        );

        const { Password, ...user } = account;
        return res.send({ token, user });
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi đăng nhập"));
    }
};

// Lấy thông tin người đang đăng nhập từ database
exports.me = async (req, res, next) => {
    try {
        const { id, role } = req.user;
        const user = await AuthService.findUserById(MongoDB.client, role, id);

        if (!user) {
            return next(new ApiError(401, "Tài khoản không tồn tại"));
        }

        return res.send(user);
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi truy xuất thông tin người dùng"));
    }
};

// Đổi mật khẩu người đang đăng nhập
exports.doiMatKhau = async (req, res, next) => {
    const { matKhauCu, matKhauMoi } = req.body || {};
    if (!matKhauCu || !matKhauMoi) {
        return next(new ApiError(400, "Vui lòng nhập mật khẩu cũ và mật khẩu mới"));
    }
    if (matKhauMoi.length < 6) {
        return next(new ApiError(400, "Mật khẩu mới phải có ít nhất 6 ký tự"));
    }

    try {
        const { id, role } = req.user;
        const account = await AuthService.findUserWithPassword(MongoDB.client, role, id);

        if (!account) {
            return next(new ApiError(401, "Tài khoản không tồn tại"));
        }

        const isMatch = await bcrypt.compare(matKhauCu, account.Password || "");
        if (!isMatch) {
            return next(new ApiError(400, "Mật khẩu cũ không đúng"));
        }

        const sameAsOld = await bcrypt.compare(matKhauMoi, account.Password || "");
        if (sameAsOld) {
            return next(new ApiError(400, "Mật khẩu mới phải khác mật khẩu cũ"));
        }

        const hashedPassword = await bcrypt.hash(matKhauMoi, 10);
        const updated = await AuthService.updatePassword(MongoDB.client, role, id, hashedPassword);
        if (!updated) {
            return next(new ApiError(401, "Tài khoản không tồn tại"));
        }

        return res.send({ message: "Đổi mật khẩu thành công" });
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi đổi mật khẩu"));
    }
};