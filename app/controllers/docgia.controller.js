const bcrypt = require("bcryptjs");
const DocGiaService = require("../services/docgia.service");
const MongoDB = require("../utils/mongodb.util");
const ApiError = require("../api-error");

const DIEN_THOAI_REGEX = /^(09|03|07|08|05)[0-9]{8}$/;

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Thêm độc giả
exports.create = async (req, res, next) => {
    if (!req.body?.MaDocGia) {
        return next(new ApiError(400, "Mã độc giả không được để trống"));
    }
    if (!req.body?.HoLot) {
        return next(new ApiError(400, "Họ lót không được để trống"));
    }
    if (!req.body?.Ten) {
        return next(new ApiError(400, "Tên không được để trống"));
    }
    if (!req.body?.Password || req.body.Password.length < 6) {
        return next(new ApiError(400, "Mật khẩu bắt buộc và phải có ít nhất 6 ký tự"));
    }
    if (req.body.Phai !== undefined && req.body.Phai !== "Nam" && req.body.Phai !== "Nu") {
        return next(new ApiError(400, "Phái chỉ được là \"Nam\" hoặc \"Nu\""));
    }
    if (req.body.DienThoai && !DIEN_THOAI_REGEX.test(req.body.DienThoai)) {
        return next(new ApiError(400, "Số điện thoại không hợp lệ"));
    }

    let ngaySinh;
    if (req.body.NgaySinh !== undefined && req.body.NgaySinh !== "") {
        ngaySinh = new Date(req.body.NgaySinh);
        if (Number.isNaN(ngaySinh.getTime())) {
            return next(new ApiError(400, "Ngày sinh không hợp lệ"));
        }
    }

    try {
        const service = new DocGiaService(MongoDB.client);
        const existed = await service.findByMa(req.body.MaDocGia);
        if (existed) {
            return next(new ApiError(409, "Mã độc giả đã tồn tại"));
        }

        // Băm mật khẩu trước khi lưu, SoLanViPham mặc định 0
        const hashedPassword = await bcrypt.hash(req.body.Password, 10);
        const data = {
            ...req.body,
            Password: hashedPassword,
            SoLanViPham: 0,
        };
        if (ngaySinh) {
            data.NgaySinh = ngaySinh;
        }

        const document = await service.create(data);
        return res.send(document);
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi tạo độc giả"));
    }
};

// Tìm tất cả độc giả, hỗ trợ ?name=
exports.findAll = async (req, res, next) => {
    try {
        const service = new DocGiaService(MongoDB.client);
        const { name } = req.query;
        const documents = name
            ? await service.findByName(name)
            : await service.find({});
        return res.send(documents);
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi truy xuất độc giả"));
    }
};

// Tìm một độc giả theo id
exports.findOne = async (req, res, next) => {
    try {
        const service = new DocGiaService(MongoDB.client);
        const document = await service.findById(req.params.id);
        if (!document) {
            return next(new ApiError(404, "Không tìm thấy độc giả"));
        }
        return res.send(document);
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi truy xuất độc giả"));
    }
};

// Cập nhật độc giả
exports.update = async (req, res, next) => {
    if (Object.keys(req.body).length === 0) {
        return next(new ApiError(400, "Dữ liệu để cập nhật không được để trống"));
    }

    if (req.body.Phai !== undefined && req.body.Phai !== "Nam" && req.body.Phai !== "Nu") {
        return next(new ApiError(400, "Phái chỉ được là \"Nam\" hoặc \"Nu\""));
    }
    if (req.body.DienThoai && !DIEN_THOAI_REGEX.test(req.body.DienThoai)) {
        return next(new ApiError(400, "Số điện thoại không hợp lệ"));
    }

    try {
        const service = new DocGiaService(MongoDB.client);
        const current = await service.findByIdWithPassword(req.params.id);
        if (!current) {
            return next(new ApiError(404, "Không tìm thấy độc giả"));
        }

        const data = { ...req.body };
        // Không cho sửa mã và số lần vi phạm qua PUT thường
        delete data.MaDocGia;
        delete data.SoLanViPham;

        if (data.NgaySinh !== undefined) {
            if (data.NgaySinh === "") {
                delete data.NgaySinh;
            } else {
                const ngaySinh = new Date(data.NgaySinh);
                if (Number.isNaN(ngaySinh.getTime())) {
                    return next(new ApiError(400, "Ngày sinh không hợp lệ"));
                }
                data.NgaySinh = ngaySinh;
            }
        }

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
            return next(new ApiError(404, "Không tìm thấy độc giả"));
        }
        return res.send({ message: "Cập nhật độc giả thành công" });
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, `Lỗi khi cập nhật độc giả id = ${req.params.id}`));
    }
};

// Xóa vi phạm: đặt SoLanViPham về 0
exports.xoaViPham = async (req, res, next) => {
    try {
        const service = new DocGiaService(MongoDB.client);
        const current = await service.findById(req.params.id);
        if (!current) {
            return next(new ApiError(404, "Không tìm thấy độc giả"));
        }
        const document = await service.update(req.params.id, { SoLanViPham: 0 });
        if (!document) {
            return next(new ApiError(404, "Không tìm thấy độc giả"));
        }
        return res.send({ message: "Xóa vi phạm thành công" });
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, `Lỗi khi xóa vi phạm độc giả id = ${req.params.id}`));
    }
};

// Xóa độc giả (kiểm tra phiếu mượn còn hiệu lực)
exports.delete = async (req, res, next) => {
    try {
        const service = new DocGiaService(MongoDB.client);
        const docgia = await service.findById(req.params.id);
        if (!docgia) {
            return next(new ApiError(404, "Không tìm thấy độc giả"));
        }

        // Không xóa độc giả còn phiếu ChoDuyet hoặc DangMuon (collection có thể chưa tồn tại)
        const muonSach = MongoDB.client.db().collection("theodoimuonsach");
        const dangMuon = await muonSach.countDocuments({
            MaDocGia: docgia.MaDocGia,
            TrangThai: { $in: ["ChoDuyet", "DangMuon"] },
        });
        if (dangMuon > 0) {
            return next(new ApiError(409, "Không thể xóa độc giả đang có phiếu chờ duyệt hoặc đang mượn"));
        }

        const document = await service.delete(req.params.id);
        if (!document) {
            return next(new ApiError(404, "Không tìm thấy độc giả"));
        }
        return res.send({ message: "Xóa độc giả thành công" });
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, `Lỗi khi xóa độc giả id = ${req.params.id}`));
    }
};
