const SachService = require("../services/sach.service");
const NhaXuatBanService = require("../services/nhaxuatban.service");
const MongoDB = require("../utils/mongodb.util");
const ApiError = require("../api-error");

// Hàm escape ký tự đặc biệt regex khi tìm kiếm theo tên
function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Thêm một sách
exports.create = async (req, res, next) => {
    if (!req.body?.MaSach) {
        return next(new ApiError(400, "Mã sách không được để trống"));
    }
    if (!req.body?.TenSach) {
        return next(new ApiError(400, "Tên sách không được để trống"));
    }
    if (!req.body?.MaNXB) {
        return next(new ApiError(400, "Mã nhà xuất bản không được để trống"));
    }

    const donGia = Number(req.body.DonGia);
    const soQuyen = Number(req.body.SoQuyen);
    if (Number.isNaN(donGia) || donGia < 0) {
        return next(new ApiError(400, "Đơn giá phải là số >= 0"));
    }
    if (!Number.isInteger(soQuyen) || soQuyen < 0) {
        return next(new ApiError(400, "Số quyển phải là số nguyên >= 0"));
    }

    try {
        const sachService = new SachService(MongoDB.client);
        const existed = await sachService.findByMa(req.body.MaSach);
        if (existed) {
            return next(new ApiError(409, "Mã sách đã tồn tại"));
        }

        // Kiểm tra mã nhà xuất bản phải tồn tại
        const nxbService = new NhaXuatBanService(MongoDB.client);
        const nxb = await nxbService.findByMa(req.body.MaNXB);
        if (!nxb) {
            return next(new ApiError(400, "Mã nhà xuất bản không tồn tại"));
        }

        // Khi tạo sách: SoQuyenCon = SoQuyen, không nhận SoQuyenCon từ client
        const data = { ...req.body, DonGia: donGia, SoQuyen: soQuyen, SoQuyenCon: soQuyen };
        if (req.body.NamXuatBan !== undefined) {
            data.NamXuatBan = Number(req.body.NamXuatBan);
        }
        const document = await sachService.create(data);
        return res.send(document);
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi tạo sách"));
    }
};

// Tìm tất cả sách, hỗ trợ ?name=, ?theloai=, ?manxb=
exports.findAll = async (req, res, next) => {
    try {
        const sachService = new SachService(MongoDB.client);
        const { name, theloai, manxb } = req.query;
        const filter = {};

        if (name) {
            filter.TenSach = { $regex: new RegExp(escapeRegex(name)), $options: "i" };
        }
        if (theloai) {
            filter.TheLoai = theloai;
        }
        if (manxb) {
            filter.MaNXB = manxb;
        }

        const documents = await sachService.find(filter);
        return res.send(documents);
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi truy xuất sách"));
    }
};

// Tìm một sách theo id
exports.findOne = async (req, res, next) => {
    try {
        const sachService = new SachService(MongoDB.client);
        const document = await sachService.findById(req.params.id);
        if (!document) {
            return next(new ApiError(404, "Không tìm thấy sách"));
        }
        return res.send(document);
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi truy xuất sách"));
    }
};

// Cập nhật sách
exports.update = async (req, res, next) => {
    if (Object.keys(req.body).length === 0) {
        return next(new ApiError(400, "Dữ liệu để cập nhật không được để trống"));
    }

    try {
        const sachService = new SachService(MongoDB.client);
        const current = await sachService.findById(req.params.id);
        if (!current) {
            return next(new ApiError(404, "Không tìm thấy sách"));
        }

        // Không cho client tự gửi SoQuyenCon để ghi đè
        const data = { ...req.body };
        delete data.SoQuyenCon;

        // Kiểm tra dữ liệu số nếu được gửi lên
        if (data.DonGia !== undefined) {
            const donGia = Number(data.DonGia);
            if (Number.isNaN(donGia) || donGia < 0) {
                return next(new ApiError(400, "Đơn giá phải là số >= 0"));
            }
            data.DonGia = donGia;
        }

        if (data.NamXuatBan !== undefined) {
            data.NamXuatBan = Number(data.NamXuatBan);
        }

        // Nếu MaNXB đổi thì phải tồn tại trong collection nhaxuatban
        if (data.MaNXB !== undefined && data.MaNXB !== current.MaNXB) {
            if (!data.MaNXB) {
                return next(new ApiError(400, "Mã nhà xuất bản không được để trống"));
            }
            const nxbService = new NhaXuatBanService(MongoDB.client);
            const nxb = await nxbService.findByMa(data.MaNXB);
            if (!nxb) {
                return next(new ApiError(400, "Mã nhà xuất bản không tồn tại"));
            }
        }

        // Nếu SoQuyen đổi thì SoQuyenCon đổi cùng chênh lệch
        if (data.SoQuyen !== undefined) {
            const soQuyenMoi = Number(data.SoQuyen);
            if (!Number.isInteger(soQuyenMoi) || soQuyenMoi < 0) {
                return next(new ApiError(400, "Số quyển phải là số nguyên >= 0"));
            }
            const chenhLech = soQuyenMoi - Number(current.SoQuyen);
            const soQuyenConMoi = Number(current.SoQuyenCon) + chenhLech;
            if (soQuyenConMoi < 0) {
                return next(new ApiError(400, "Số quyển còn không được âm khi thay đổi tổng số quyển"));
            }
            data.SoQuyen = soQuyenMoi;
            data.SoQuyenCon = soQuyenConMoi;
        }

        const document = await sachService.update(req.params.id, data);
        if (!document) {
            return next(new ApiError(404, "Không tìm thấy sách"));
        }
        return res.send({ message: "Cập nhật sách thành công" });
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, `Lỗi khi cập nhật sách id = ${req.params.id}`));
    }
};

// Xóa sách (kiểm tra phiếu mượn còn hiệu lực)
exports.delete = async (req, res, next) => {
    try {
        const sachService = new SachService(MongoDB.client);
        const sach = await sachService.findById(req.params.id);
        if (!sach) {
            return next(new ApiError(404, "Không tìm thấy sách"));
        }

        // Không xóa sách còn phiếu ChoDuyet hoặc DangMuon (collection có thể chưa tồn tại)
        const muonSach = MongoDB.client.db().collection("theodoimuonsach");
        const dangMuon = await muonSach.countDocuments({
            MaSach: sach.MaSach,
            TrangThai: { $in: ["ChoDuyet", "DangMuon"] },
        });
        if (dangMuon > 0) {
            return next(new ApiError(409, "Không thể xóa sách đang có phiếu chờ duyệt hoặc đang mượn"));
        }

        const document = await sachService.delete(req.params.id);
        if (!document) {
            return next(new ApiError(404, "Không tìm thấy sách"));
        }
        return res.send({ message: "Xóa sách thành công" });
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, `Lỗi khi xóa sách id = ${req.params.id}`));
    }
};
