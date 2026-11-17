const { ObjectId } = require("mongodb");
const config = require("../config");
const ApiError = require("../api-error");

class MuonSachService {
    constructor(client) {
        this.db = client.db();
        this.MuonSach = this.db.collection("theodoimuonsach");
        this.Sach = this.db.collection("sach");
        this.DocGia = this.db.collection("docgia");
    }

    // Kiểm tra điều kiện mượn sách theo đúng thứ tự SPEC mục 4.1
    async checkCanBorrow(maDocGia, maSach, options = {}) {
        const { checkItems = [1, 2, 3, 4, 5, 6] } = options;
        const { maxViolations, maxBorrowAtOnce } = config.rules;
        const now = new Date();

        let docgia = null;
        let sach = null;

        if (checkItems.includes(1) || checkItems.includes(2)) {
            docgia = await this.DocGia.findOne({ MaDocGia: maDocGia });
            if (checkItems.includes(1) && !docgia) {
                throw new ApiError(404, "Không tìm thấy độc giả");
            }
        }

        if (checkItems.includes(2)) {
            if ((docgia?.SoLanViPham || 0) >= maxViolations) {
                throw new ApiError(403, "Bạn đã bị 3 dấu xấu, không được mượn sách");
            }
        }

        if (checkItems.includes(3)) {
            const quaHan = await this.MuonSach.countDocuments({
                MaDocGia: maDocGia,
                TrangThai: "DangMuon",
                HanTra: { $lt: now },
            });
            if (quaHan > 0) {
                throw new ApiError(403, "Bạn đang giữ sách quá hạn, hãy trả trước");
            }
        }

        if (checkItems.includes(4)) {
            const dangGiu = await this.MuonSach.countDocuments({
                MaDocGia: maDocGia,
                TrangThai: { $in: ["ChoDuyet", "DangMuon"] },
            });
            if (dangGiu >= maxBorrowAtOnce) {
                throw new ApiError(403, "Bạn đã đạt số lượng sách mượn tối đa cho phép");
            }
        }

        if (checkItems.includes(5)) {
            sach = await this.Sach.findOne({ MaSach: maSach });
            if (!sach || sach.SoQuyenCon <= 0) {
                throw new ApiError(409, "Sách đã hết");
            }
        }

        if (checkItems.includes(6)) {
            const trung = await this.MuonSach.countDocuments({
                MaDocGia: maDocGia,
                MaSach: maSach,
                TrangThai: { $in: ["ChoDuyet", "DangMuon"] },
            });
            if (trung > 0) {
                throw new ApiError(409, "Bạn đã có phiếu mượn sách này đang chờ duyệt hoặc đang mượn");
            }
        }

        return { docgia, sach };
    }

    async findById(id) {
        return await this.MuonSach.findOne({
            _id: ObjectId.isValid(id) ? new ObjectId(id) : null,
        });
    }

    async create(payload) {
        const result = await this.MuonSach.insertOne(payload);
        return { _id: result.insertedId, ...payload };
    }

    // Trừ SoQuyenCon nguyên tử
    async decrementSach(maSach) {
        return await this.Sach.findOneAndUpdate(
            { MaSach: maSach, SoQuyenCon: { $gt: 0 } },
            { $inc: { SoQuyenCon: -1 } },
            { returnDocument: "after" }
        );
    }

    // Cộng trả SoQuyenCon khi cần hoàn tác
    async incrementSach(maSach) {
        return await this.Sach.findOneAndUpdate(
            { MaSach: maSach },
            { $inc: { SoQuyenCon: 1 } },
            { returnDocument: "after" }
        );
    }

    async updatePhieu(id, filterExtra, update) {
        const filter = {
            _id: ObjectId.isValid(id) ? new ObjectId(id) : null,
            ...filterExtra,
        };
        return await this.MuonSach.findOneAndUpdate(
            filter,
            { $set: update },
            { returnDocument: "after" }
        );
    }

    // Cộng SoQuyenCon +1 nhưng không vượt SoQuyen (nguyên tử, không đọc rồi ghi)
    async incrementSachKhongVuot(maSach) {
        return await this.Sach.findOneAndUpdate(
            { MaSach: maSach, $expr: { $lt: ["$SoQuyenCon", "$SoQuyen"] } },
            { $inc: { SoQuyenCon: 1 } },
            { returnDocument: "after" }
        );
    }

    // Trừ lại 1 khi cần hoàn tác bước cộng sách
    async decrementSachHoanTac(maSach) {
        return await this.Sach.findOneAndUpdate(
            { MaSach: maSach, SoQuyenCon: { $gt: 0 } },
            { $inc: { SoQuyenCon: -1 } },
            { returnDocument: "after" }
        );
    }

    // Tăng số lần vi phạm của độc giả
    async incrementViPham(maDocGia) {
        return await this.DocGia.findOneAndUpdate(
            { MaDocGia: maDocGia },
            { $inc: { SoLanViPham: 1 } },
            { returnDocument: "after", projection: { Password: 0 } }
        );
    }

    // Giảm số lần vi phạm khi cần hoàn tác
    async decrementViPham(maDocGia) {
        return await this.DocGia.findOneAndUpdate(
            { MaDocGia: maDocGia, SoLanViPham: { $gt: 0 } },
            { $inc: { SoLanViPham: -1 } },
            { returnDocument: "after", projection: { Password: 0 } }
        );
    }

    // Lấy danh sách phiếu kèm thông tin, mới nhất trước
    async findAllWithDetails(match = {}, includeDocGia = false) {
        const pipeline = [
            { $match: match },
            { $sort: { _id: -1 } },
            {
                $lookup: {
                    from: "sach",
                    localField: "MaSach",
                    foreignField: "MaSach",
                    as: "sach",
                },
            },
            { $unwind: { path: "$sach", preserveNullAndEmptyArrays: true } },
        ];

        if (includeDocGia) {
            pipeline.push({
                $lookup: {
                    from: "docgia",
                    let: { maDocGia: "$MaDocGia" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$MaDocGia", "$$maDocGia"] } } },
                        { $project: { Password: 0 } },
                    ],
                    as: "docgia",
                },
            });
            pipeline.push({ $unwind: { path: "$docgia", preserveNullAndEmptyArrays: true } });
        }

        const project = {
            _id: 1,
            MaDocGia: 1,
            MaSach: 1,
            NgayYeuCau: 1,
            NgayMuon: 1,
            HanTra: 1,
            NgayTra: 1,
            TrangThai: 1,
            MSNV: 1,
            TinhTrangSach: 1,
            ViPham: 1,
            TenSach: "$sach.TenSach",
        };

        if (includeDocGia) {
            project.HoLot = "$docgia.HoLot";
            project.Ten = "$docgia.Ten";
        }

        pipeline.push({ $project: project });

        return await this.MuonSach.aggregate(pipeline).toArray();
    }
}

module.exports = MuonSachService;
