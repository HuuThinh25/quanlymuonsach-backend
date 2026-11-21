const config = require("../config");
const MuonSachService = require("../services/muonsach.service");
const MongoDB = require("../utils/mongodb.util");
const ApiError = require("../api-error");

// Độc giả gửi yêu cầu mượn sách
exports.yeuCau = async (req, res, next) => {
    const maSach = req.body?.MaSach;
    if (!maSach) {
        return next(new ApiError(400, "Mã sách không được để trống"));
    }

    try {
        const service = new MuonSachService(MongoDB.client);
        const maDocGia = req.user.ma;

        // Kiểm tra điều kiện mượn theo đúng thứ tự SPEC 4.1
        await service.checkCanBorrow(maDocGia, maSach);

        const phieu = {
            MaDocGia: maDocGia,
            MaSach: maSach,
            NgayYeuCau: new Date(),
            NgayMuon: null,
            HanTra: null,
            NgayTra: null,
            TrangThai: "ChoDuyet",
            MSNV: null,
            TinhTrangSach: null,
            ViPham: null,
        };

        const document = await service.create(phieu);
        return res.send(document);
    } catch (error) {
        console.log(error);
        return next(error.statusCode ? error : new ApiError(500, "Lỗi khi gửi yêu cầu mượn sách"));
    }
};

// Độc giả xem phiếu mượn của chính mình
exports.cuaToi = async (req, res, next) => {
    try {
        const service = new MuonSachService(MongoDB.client);
        const documents = await service.findAllWithDetails({ MaDocGia: req.user.ma }, false);
        return res.send(documents);
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi truy xuất phiếu mượn của bạn"));
    }
};

// Nhân viên lập phiếu mượn trực tiếp
exports.create = async (req, res, next) => {
    const { MaDocGia, MaSach } = req.body || {};
    if (!MaDocGia) {
        return next(new ApiError(400, "Mã độc giả không được để trống"));
    }
    if (!MaSach) {
        return next(new ApiError(400, "Mã sách không được để trống"));
    }

    try {
        const service = new MuonSachService(MongoDB.client);
        await service.checkCanBorrow(MaDocGia, MaSach);

        // Trừ SoQuyenCon nguyên tử
        const sach = await service.decrementSach(MaSach);
        if (!sach) {
            return next(new ApiError(409, "Sách đã hết"));
        }

        const ngayMuon = new Date();
        const hanTra = new Date(ngayMuon);
        hanTra.setDate(hanTra.getDate() + config.rules.borrowDays);

        const phieu = {
            MaDocGia,
            MaSach,
            NgayYeuCau: ngayMuon,
            NgayMuon: ngayMuon,
            HanTra: hanTra,
            NgayTra: null,
            TrangThai: "DangMuon",
            MSNV: req.user.ma,
            TinhTrangSach: null,
            ViPham: null,
        };

        const document = await service.create(phieu);
        return res.send(document);
    } catch (error) {
        console.log(error);
        return next(error.statusCode ? error : new ApiError(500, "Lỗi khi lập phiếu mượn"));
    }
};

// Nhân viên xem danh sách phiếu mượn
exports.findAll = async (req, res, next) => {
    try {
        const service = new MuonSachService(MongoDB.client);
        const { trangthai, quahan } = req.query;
        const filter = {};

        if (trangthai) {
            filter.TrangThai = trangthai;
        }
        if (quahan === "true") {
            filter.TrangThai = "DangMuon";
            filter.HanTra = { $lt: new Date() };
        }

        const documents = await service.findAllWithDetails(filter, true);
        return res.send(documents);
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi truy xuất phiếu mượn"));
    }
};

// Nhân viên duyệt phiếu mượn
exports.duyet = async (req, res, next) => {
    try {
        const service = new MuonSachService(MongoDB.client);
        const phieu = await service.findById(req.params.id);
        if (!phieu) {
            return next(new ApiError(404, "Không tìm thấy phiếu mượn"));
        }
        if (phieu.TrangThai !== "ChoDuyet") {
            return next(new ApiError(409, "Chỉ có thể duyệt phiếu đang chờ duyệt"));
        }

        // Kiểm tra lại điều kiện 4.1 mục 2 đến 4 tại thời điểm duyệt
        await service.checkCanBorrow(phieu.MaDocGia, phieu.MaSach, { checkItems: [2, 3, 4] });

        // Trừ SoQuyenCon nguyên tử
        const sach = await service.decrementSach(phieu.MaSach);
        if (!sach) {
            return next(new ApiError(409, "Sách đã hết"));
        }

        const ngayMuon = new Date();
        const hanTra = new Date(ngayMuon);
        hanTra.setDate(hanTra.getDate() + config.rules.borrowDays);

        const updated = await service.updatePhieu(
            req.params.id,
            { TrangThai: "ChoDuyet" },
            {
                TrangThai: "DangMuon",
                NgayMuon: ngayMuon,
                HanTra: hanTra,
                MSNV: req.user.ma,
            }
        );

        // Nếu cập nhật phiếu thất bại thì hoàn trả sách
        if (!updated) {
            await service.incrementSach(phieu.MaSach);
            return next(new ApiError(409, "Không thể duyệt phiếu mượn này"));
        }

        return res.send({ message: "Duyệt phiếu mượn thành công" });
    } catch (error) {
        console.log(error);
        return next(error.statusCode ? error : new ApiError(500, "Lỗi khi duyệt phiếu mượn"));
    }
};

// Nhân viên ghi trả sách
exports.tra = async (req, res, next) => {
    const { TinhTrangSach } = req.body || {};
    if (TinhTrangSach !== "BinhThuong" && TinhTrangSach !== "Hong") {
        return next(new ApiError(400, "Tình trạng sách phải là \"BinhThuong\" hoặc \"Hong\""));
    }

    try {
        const service = new MuonSachService(MongoDB.client);
        const phieu = await service.findById(req.params.id);
        if (!phieu) {
            return next(new ApiError(404, "Không tìm thấy phiếu mượn"));
        }
        if (phieu.TrangThai !== "DangMuon") {
            return next(new ApiError(409, "Chỉ có thể ghi trả phiếu đang mượn"));
        }

        const ngayTra = new Date();
        const hong = TinhTrangSach === "Hong";
        const quaHan = !!(phieu.HanTra && ngayTra > new Date(phieu.HanTra));
        let viPham = null;
        if (hong) viPham = "HuHong";
        else if (quaHan) viPham = "QuaHan";
        const soDauViPham = (hong ? 1 : 0) + (quaHan ? 1 : 0);

        // Thứ tự thao tác để hạn chế nửa vời:
        // 1) Cộng sách nguyên tử (không vượt SoQuyen, sách hỏng vẫn cộng lại).
        // 2) Cập nhật phiếu với điều kiện DangMuon; nếu thất bại thì hoàn tác cộng sách.
        // 3) Nếu có vi phạm, ghi ViPham và $inc SoLanViPham; nếu ghi ViPham thất bại thì hoàn tác tăng vi phạm.
        const sachTang = await service.incrementSachKhongVuot(phieu.MaSach);
        if (!sachTang) {
            return next(new ApiError(409, "Không thể ghi trả: số quyển còn đã đạt tối đa"));
        }

        const updated = await service.updatePhieu(
            req.params.id,
            { TrangThai: "DangMuon" },
            {
                TrangThai: "DaTra",
                NgayTra: ngayTra,
                TinhTrangSach,
                MSNV: req.user.ma,
            }
        );

        if (!updated) {
            // Hoàn tác bước cộng sách nếu không chuyển được trạng thái phiếu
            await service.decrementSachHoanTac(phieu.MaSach);
            return next(new ApiError(409, "Không thể ghi trả phiếu mượn này"));
        }

        let soLanViPham = null;
        if (soDauViPham > 0) {
            const docgia = await service.incrementViPham(phieu.MaDocGia, soDauViPham);
            soLanViPham = docgia ? docgia.SoLanViPham : null;

            const updatedViPham = await service.updatePhieu(
                req.params.id,
                { TrangThai: "DaTra" },
                { ViPham: viPham }
            );
            if (!updatedViPham) {
                await service.decrementViPham(phieu.MaDocGia, soDauViPham);
                return next(new ApiError(500, "Lỗi khi ghi nhận vi phạm trả sách"));
            }
        }

        const result = soDauViPham > 0 ? await service.findById(req.params.id) : updated;
        if (soDauViPham > 0) {
            return res.send({ ...result, viPham, soLanViPham });
        }
        return res.send(updated);
    } catch (error) {
        console.log(error);
        return next(error.statusCode ? error : new ApiError(500, "Lỗi khi ghi trả sách"));
    }
};

// Nhân viên từ chối phiếu mượn
exports.tuChoi = async (req, res, next) => {
    try {
        const service = new MuonSachService(MongoDB.client);
        const phieu = await service.findById(req.params.id);
        if (!phieu) {
            return next(new ApiError(404, "Không tìm thấy phiếu mượn"));
        }
        if (phieu.TrangThai !== "ChoDuyet") {
            return next(new ApiError(409, "Chỉ có thể từ chối phiếu đang chờ duyệt"));
        }

        const updated = await service.updatePhieu(
            req.params.id,
            { TrangThai: "ChoDuyet" },
            { TrangThai: "TuChoi", MSNV: req.user.ma }
        );

        if (!updated) {
            return next(new ApiError(409, "Không thể từ chối phiếu mượn này"));
        }

        return res.send({ message: "Từ chối phiếu mượn thành công" });
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi từ chối phiếu mượn"));
    }
};
