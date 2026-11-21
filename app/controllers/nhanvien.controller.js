const bcrypt = require("bcryptjs");
const NhanVienService = require("../services/nhanvien.service");
const MongoDB = require("../utils/mongodb.util");
const ApiError = require("../api-error");
const config = require("../config");

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeEmail(email) {
    if (email === undefined || email === null) return undefined;
    return String(email).trim().toLowerCase();
}

// Thêm nhân viên
exports.create = async (req, res, next) => {
    if (!req.body?.MSNV) {
        return next(new ApiError(400, "Mã số nhân viên không được để trống"));
    }
    if (!req.body?.HoTenNV) {
        return next(new ApiError(400, "Họ tên nhân viên không được để trống"));
    }
    if (!req.body?.Password || req.body.Password.length < 6) {
        return next(new ApiError(400, "Mật khẩu bắt buộc và phải có ít nhất 6 ký tự"));
    }

    // ChucVu chỉ nhận QuanLy hoặc NhanVien
    let chucVu = req.body.ChucVu;
    if (chucVu === undefined || chucVu === null || chucVu === "") {
        chucVu = "NhanVien";
    }
    if (chucVu !== "QuanLy" && chucVu !== "NhanVien") {
        return next(new ApiError(400, "Chức vụ chỉ nhận QuanLy hoặc NhanVien"));
    }

    // Email chuẩn hóa và kiểm tra định dạng
    let email = normalizeEmail(req.body.Email);
    if (email !== undefined && email !== "") {
        if (!isValidEmail(email)) {
            return next(new ApiError(400, "Email không hợp lệ"));
        }
    } else {
        email = undefined;
    }

    try {
        const service = new NhanVienService(MongoDB.client);
        const existed = await service.findByMa(req.body.MSNV);
        if (existed) {
            return next(new ApiError(409, "Mã số nhân viên đã tồn tại"));
        }
        if (email) {
            const existedEmail = await service.findByEmail ? await service.findByEmail(email) : await MongoDB.client.db().collection("nhanvien").findOne({ Email: email });
            if (existedEmail) {
                return next(new ApiError(409, "Email đã được sử dụng"));
            }
        }

        // Băm mật khẩu trước khi lưu
        const hashedPassword = await bcrypt.hash(req.body.Password, 10);
        const data = { ...req.body, Password: hashedPassword, ChucVu: chucVu };
        if (email) data.Email = email; else delete data.Email;
        const document = await service.create(data);
        return res.send(document);
    } catch (error) {
        console.log(error);
        if (error && error.code === 11000) {
            return next(new ApiError(409, "Email đã được sử dụng"));
        }
        return next(new ApiError(500, "Lỗi khi tạo nhân viên"));
    }
};

// Tìm tất cả nhân viên, hỗ trợ ?name=
exports.findAll = async (req, res, next) => {
    try {
        const service = new NhanVienService(MongoDB.client);
        const { name } = req.query;
        const documents = name
            ? await service.findByName(name)
            : await service.find({});
        return res.send(documents);
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi truy xuất nhân viên"));
    }
};

// Tìm một nhân viên theo id
exports.findOne = async (req, res, next) => {
    try {
        const service = new NhanVienService(MongoDB.client);
        const document = await service.findById(req.params.id);
        if (!document) {
            return next(new ApiError(404, "Không tìm thấy nhân viên"));
        }
        return res.send(document);
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi truy xuất nhân viên"));
    }
};

// Cập nhật nhân viên
exports.update = async (req, res, next) => {
    if (Object.keys(req.body).length === 0) {
        return next(new ApiError(400, "Dữ liệu để cập nhật không được để trống"));
    }

    try {
        const service = new NhanVienService(MongoDB.client);
        const current = await service.findByIdWithPassword(req.params.id);
        if (!current) {
            return next(new ApiError(404, "Không tìm thấy nhân viên"));
        }

        const data = { ...req.body };
        // Không cho sửa mã nhân viên sau khi đã tạo
        delete data.MSNV;

        // Nếu có Password không rỗng thì băm lại, ngược lại giữ nguyên
        if (data.Password !== undefined) {
            if (data.Password === "") {
                delete data.Password;
            } else {
                if (data.Password.length < 6) {
                    return next(new ApiError(400, "Mật khẩu phải có ít nhất 6 ký tự"));
                }
                data.Password = await bcrypt.hash(data.Password, 10);
            }
        }

        // ChucVu chỉ nhận QuanLy/NhanVien
        if (data.ChucVu !== undefined) {
            if (data.ChucVu === "") delete data.ChucVu;
            else if (data.ChucVu !== "QuanLy" && data.ChucVu !== "NhanVien") {
                return next(new ApiError(400, "Chức vụ chỉ nhận QuanLy hoặc NhanVien"));
            }
        }

        // Quy tắc 4.7: không tự hạ cấp chính mình
        if (data.ChucVu && data.ChucVu !== current.ChucVu) {
            if (req.user && req.user.id === req.params.id && current.ChucVu === "QuanLy" && data.ChucVu === "NhanVien") {
                return next(new ApiError(409, "Không thể tự hạ cấp chính mình"));
            }
            // Luôn còn ít nhất một QuanLy
            if (current.ChucVu === "QuanLy" && data.ChucVu === "NhanVien") {
                const qlCount = await MongoDB.client.db().collection("nhanvien").countDocuments({ ChucVu: "QuanLy" });
                if (qlCount <= 1) {
                    return next(new ApiError(409, "Phải còn ít nhất một Quản lý"));
                }
            }
        }

        // Email chuẩn hóa
        if (data.Email !== undefined) {
            const email = normalizeEmail(data.Email);
            if (email === "" ) {
                delete data.Email;
            } else {
                if (!isValidEmail(email)) {
                    return next(new ApiError(400, "Email không hợp lệ"));
                }
                // kiểm tra trùng
                const existedEmail = await MongoDB.client.db().collection("nhanvien").findOne({ Email: email, _id: { $ne: current._id } });
                if (existedEmail) {
                    return next(new ApiError(409, "Email đã được sử dụng"));
                }
                data.Email = email;
            }
        }

        const document = await service.update(req.params.id, data);
        if (!document) {
            return next(new ApiError(404, "Không tìm thấy nhân viên"));
        }
        return res.send({ message: "Cập nhật nhân viên thành công" });
    } catch (error) {
        console.log(error);
        if (error && error.code === 11000) {
            return next(new ApiError(409, "Email đã được sử dụng"));
        }
        return next(new ApiError(500, `Lỗi khi cập nhật nhân viên id = ${req.params.id}`));
    }
};

// Xóa nhân viên
exports.delete = async (req, res, next) => {
    try {
        const service = new NhanVienService(MongoDB.client);
        const current = await service.findById(req.params.id);
        if (!current) {
            return next(new ApiError(404, "Không tìm thấy nhân viên"));
        }

        // Quy tắc 4.7: không tự xóa chính mình
        if (req.user && req.user.id === req.params.id) {
            return next(new ApiError(409, "Không thể tự xóa tài khoản của mình"));
        }
        // Luôn còn ít nhất một QuanLy
        if (current.ChucVu === "QuanLy") {
            const qlCount = await MongoDB.client.db().collection("nhanvien").countDocuments({ ChucVu: "QuanLy" });
            if (qlCount <= 1) {
                return next(new ApiError(409, "Phải còn ít nhất một Quản lý"));
            }
        }

        const document = await service.delete(req.params.id);
        if (!document) {
            return next(new ApiError(404, "Không tìm thấy nhân viên"));
        }
        return res.send({ message: "Xóa nhân viên thành công" });
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, `Lỗi khi xóa nhân viên id = ${req.params.id}`));
    }
};
