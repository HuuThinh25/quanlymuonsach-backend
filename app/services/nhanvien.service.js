const { ObjectId } = require("mongodb");

class NhanVienService {
    constructor(client) {
        this.NhanVien = client.db().collection("nhanvien");
    }

    // Chỉ lấy các trường hợp lệ từ dữ liệu client gửi lên
    extractData(payload) {
        const nhanvien = {
            MSNV: payload.MSNV,
            HoTenNV: payload.HoTenNV,
            Password: payload.Password,
            ChucVu: payload.ChucVu,
            DiaChi: payload.DiaChi,
            SoDienThoai: payload.SoDienThoai,
        };

        // Xóa các trường undefined
        Object.keys(nhanvien).forEach(
            (key) => nhanvien[key] === undefined && delete nhanvien[key]
        );
        return nhanvien;
    }

    async create(payload) {
        const nhanvien = this.extractData(payload);
        const result = await this.NhanVien.insertOne(nhanvien);
        const { Password, ...safe } = nhanvien;
        return { _id: result.insertedId, ...safe };
    }

    async find(filter) {
        const cursor = await this.NhanVien.find(filter, { projection: { Password: 0 } });
        return await cursor.toArray();
    }

    async findById(id) {
        return await this.NhanVien.findOne(
            { _id: ObjectId.isValid(id) ? new ObjectId(id) : null },
            { projection: { Password: 0 } }
        );
    }

    // Lấy đầy đủ (bao gồm Password) để kiểm tra/cập nhật mật khẩu
    async findByIdWithPassword(id) {
        return await this.NhanVien.findOne({
            _id: ObjectId.isValid(id) ? new ObjectId(id) : null,
        });
    }

    async findByMa(msnv) {
        return await this.NhanVien.findOne({ MSNV: msnv });
    }

    async findByName(name) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return await this.find({
            HoTenNV: { $regex: new RegExp(escaped, "i") },
        });
    }

    async update(id, payload) {
        const filter = {
            _id: ObjectId.isValid(id) ? new ObjectId(id) : null,
        };
        const update = this.extractData(payload);
        return await this.NhanVien.findOneAndUpdate(
            filter,
            { $set: update },
            { returnDocument: "after", projection: { Password: 0 } }
        );
    }

    async delete(id) {
        return await this.NhanVien.findOneAndDelete(
            { _id: ObjectId.isValid(id) ? new ObjectId(id) : null },
            { projection: { Password: 0 } }
        );
    }
}

module.exports = NhanVienService;
