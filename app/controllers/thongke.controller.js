const config = require("../config");
const MongoDB = require("../utils/mongodb.util");
const ApiError = require("../api-error");
const { ObjectId } = require("mongodb");

exports.tongQuan = async (req, res, next) => {
    try {
        const db = MongoDB.client.db();
        const now = new Date();
        const maxViolations = config.rules.maxViolations;
        const lowStock = config.rules.lowStock;

        const choDuyet = await db.collection("theodoimuonsach").countDocuments({ TrangThai: "ChoDuyet" });
        const dangMuon = await db.collection("theodoimuonsach").countDocuments({ TrangThai: "DangMuon" });
        const quaHan = await db.collection("theodoimuonsach").countDocuments({ TrangThai: "DangMuon", HanTra: { $lt: now } });
        const docGiaBiCam = await db.collection("docgia").countDocuments({ SoLanViPham: { $gte: maxViolations } });
        const sachSapHet = await db.collection("sach").countDocuments({ SoQuyenCon: { $lte: lowStock } });
        const tongSach = await db.collection("sach").countDocuments({});
        const tongDocGia = await db.collection("docgia").countDocuments({});

        // choDuyetMoiNhat: tối đa 5 phiếu ChoDuyet mới nhất, kèm tên sách và họ tên độc giả
        const pipeline = [
            { $match: { TrangThai: "ChoDuyet" } },
            { $sort: { _id: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "sach",
                    localField: "MaSach",
                    foreignField: "MaSach",
                    as: "sach",
                },
            },
            { $unwind: { path: "$sach", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "docgia",
                    let: { maDocGia: "$MaDocGia" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$MaDocGia", "$$maDocGia"] } } },
                        { $project: { Password: 0 } },
                    ],
                    as: "docgia",
                },
            },
            { $unwind: { path: "$docgia", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    MaDocGia: 1,
                    MaSach: 1,
                    NgayYeuCau: 1,
                    TrangThai: 1,
                    TenSach: "$sach.TenSach",
                    HoLot: "$docgia.HoLot",
                    Ten: "$docgia.Ten",
                },
            },
        ];
        const choDuyetMoiNhat = await db.collection("theodoimuonsach").aggregate(pipeline).toArray();

        return res.send({
            choDuyet,
            dangMuon,
            quaHan,
            docGiaBiCam,
            sachSapHet,
            tongSach,
            tongDocGia,
            choDuyetMoiNhat,
        });
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi truy xuất thống kê"));
    }
};
