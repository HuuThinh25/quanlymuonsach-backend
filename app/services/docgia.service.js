const { ObjectId } = require("mongodb");

class DocGiaService {
    constructor(client) {
        this.DocGia = client.db().collection("docgia");
    }

    // Chỉ lấy các trường hợp lệ từ dữ liệu client gửi lên
    extractData(payload) {
        const docgia = {
            MaDocGia: payload.MaDocGia,
            HoLot: payload.HoLot,
            Ten: payload.Ten,
            NgaySinh: payload.NgaySinh,
            Phai: payload.Phai,
            DiaChi: payload.DiaChi,
            DienThoai: payload.DienThoai,
            Email: payload.Email,
            Password: payload.Password,
            SoLanViPham: payload.SoLanViPham,
            NgayDangKy: payload.NgayDangKy,
        };

        // Xóa các trường undefined
        Object.keys(docgia).forEach(
            (key) => docgia[key] === undefined && delete docgia[key]
        );
        return docgia;
    }

    async create(payload) {
        const docgia = this.extractData(payload);
        const result = await this.DocGia.insertOne(docgia);
        const { Password, ...safe } = docgia;
        return { _id: result.insertedId, ...safe };
    }

    async find(filter) {
        const cursor = await this.DocGia.find(filter, { projection: { Password: 0 } });
        return await cursor.toArray();
    }

    async findById(id) {
        return await this.DocGia.findOne(
            { _id: ObjectId.isValid(id) ? new ObjectId(id) : null },
            { projection: { Password: 0 } }
        );
    }

    // Lấy đầy đủ (bao gồm Password) để kiểm tra/cập nhật mật khẩu
    async findByIdWithPassword(id) {
        return await this.DocGia.findOne({
            _id: ObjectId.isValid(id) ? new ObjectId(id) : null,
        });
    }

    async findByMa(maDocGia) {
        return await this.DocGia.findOne({ MaDocGia: maDocGia });
    }

    async findByEmail(email) {
        return await this.DocGia.findOne({ Email: email });
    }

    async findByName(name) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        return await this.find({ $or: [{ HoLot: { $regex: regex } }, { Ten: { $regex: regex } }] });
    }

    async update(id, payload) {
        const filter = {
            _id: ObjectId.isValid(id) ? new ObjectId(id) : null,
        };
        const update = this.extractData(payload);
        return await this.DocGia.findOneAndUpdate(
            filter,
            { $set: update },
            { returnDocument: "after", projection: { Password: 0 } }
        );
    }

    async delete(id) {
        return await this.DocGia.findOneAndDelete(
            { _id: ObjectId.isValid(id) ? new ObjectId(id) : null },
            { projection: { Password: 0 } }
        );
    }
}

module.exports = DocGiaService;
