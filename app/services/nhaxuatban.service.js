const { ObjectId } = require('mongodb');

class NhaXuatBanService {
    constructor(client) {
        this.NhaXuatBan = client.db().collection("nhaxuatban");
    }

    //chi lay  cac truong hop le tu du lieu client gui len
    extracData(payload) {
        const nxb = {
            MaNXB: payload.MaNXB,
            TenNXB: payload.TenNXB,
            DiaChi: payload.DiaChi,
        };

        //Xoa cac truong undefined
        Object.keys(nxb).forEach(
            (key) => nxb[key] === undefined && delete nxb[key]
        );
        return nxb;
    }
    async create(payloadd) {
        const nxb = this.extracData(payloadd);
        const result = await this.NhaXuatBan.insertOne(nxb);
        return { _id: result.insertedId, ...nxb };
    }
    async find(filter) {
        const cursor = await this.NhaXuatBan.find(filter);
        return await cursor.toArray();
    }
    async findByName(name) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return await this.find({
            TenNXB: { $regex: new RegExp(escaped), $options: "i" },
        });
    }
    async findByMa(maNXB) {
        return await this.NhaXuatBan.findOne({ MaNXB: maNXB });
    }

    async findById(id) {
        return await this.NhaXuatBan.findOne({
            _id: ObjectId.isValid(id) ? new ObjectId(id) : null,
        });
    }

    async update(id, payload) {
        const filter = {
            _id: ObjectId.isValid(id) ? new ObjectId(id) : null,
        };
        const update = this.extracData(payload);
        return await this.NhaXuatBan.findOneAndUpdate(
            filter,
            { $set: update },
            { returnDocument: "after" }
        );
    }

    async delete(id) {
        return await this.NhaXuatBan.findOneAndDelete({
            _id: ObjectId.isValid(id) ? new ObjectId(id) : null,
        });
    }
}

module.exports = NhaXuatBanService;;
