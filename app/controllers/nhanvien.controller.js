const bcrypt = require("bcryptjs");
const NhanVienService = require("../services/nhanvien.service");
const MongoDB = require("../utils/mongodb.util");
const ApiError = require("../api-error");

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

    try {
        const service = new NhanVienService(MongoDB.client);
        const existed = await service.findByMa(req.body.MSNV);
        if (existed) {
            return next(new ApiError(409, "Mã số nhân viên đã tồn tại"));
        }

        // Băm mật khẩu trước khi lưu
        const hashedPassword = await bcrypt.hash(req.body.Password, 10);
        const data = { ...req.body, Password: hashedPassword };
        const document = await service.create(data);
        return res.send(document);
    } catch (error) {
        console.log(error);
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
    console.log("PUT nhanvien:", req.originalUrl, req.params.id, req.body);
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

        const document = await service.update(req.params.id, data);
        if (!document) {
            return next(new ApiError(404, "Không tìm thấy nhân viên"));
        }
        return res.send({ message: "Cập nhật nhân viên thành công" });
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, `Lỗi khi cập nhật nhân viên id = ${req.params.id}`));
    }
};

// Xóa nhân viên
exports.delete = async (req, res, next) => {
    if (req.user?.id === req.params.id) {
        return next(new ApiError(400, "Không thể tự xóa tài khoản của mình"));
    }
    try {
        const service = new NhanVienService(MongoDB.client);
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
