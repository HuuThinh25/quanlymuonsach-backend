const { ObjectId } = require("mongodb");

class SachService {
    constructor(client) {
        this.Sach = client.db().collection("sach");
    }

    // Chỉ lấy các trường hợp lệ từ dữ liệu client gửi lên
    extractData(payload) {
        const sach = {
            MaSach: payload.MaSach,
            TenSach: payload.TenSach,
            DonGia: payload.DonGia,
            SoQuyen: payload.SoQuyen,
            SoQuyenCon: payload.SoQuyenCon,
            NamXuatBan: payload.NamXuatBan,
            MaNXB: payload.MaNXB,
            NguonGocTacGia: payload.NguonGocTacGia,
            TheLoai: payload.TheLoai,
        };

        // Ép kiểu số cho các trường số
        if (sach.DonGia !== undefined) sach.DonGia = Number(sach.DonGia);
        if (sach.SoQuyen !== undefined) sach.SoQuyen = Number(sach.SoQuyen);
        if (sach.SoQuyenCon !== undefined) sach.SoQuyenCon = Number(sach.SoQuyenCon);
        if (sach.NamXuatBan !== undefined) sach.NamXuatBan = Number(sach.NamXuatBan);

        // Xóa các trường undefined
        Object.keys(sach).forEach(
            (key) => sach[key] === undefined && delete sach[key]
        );
        return sach;
    }

    async create(payload) {
        const sach = this.extractData(payload);
        const result = await this.Sach.insertOne(sach);
        return { _id: result.insertedId, ...sach };
    }

    async find(filter) {
        const cursor = await this.Sach.find(filter);
        return await cursor.toArray();
    }

    async findById(id) {
        return await this.Sach.findOne({
            _id: ObjectId.isValid(id) ? new ObjectId(id) : null,
        });
    }

    async findByMa(maSach) {
        return await this.Sach.findOne({ MaSach: maSach });
    }

    async update(id, payload) {
        const filter = {
            _id: ObjectId.isValid(id) ? new ObjectId(id) : null,
        };
        const update = this.extractData(payload);
        return await this.Sach.findOneAndUpdate(
            filter,
            { $set: update },
            { returnDocument: "after" }
        );
    }

    async delete(id) {
        return await this.Sach.findOneAndDelete({
            _id: ObjectId.isValid(id) ? new ObjectId(id) : null,
        });
    }
}

module.exports = SachService;
