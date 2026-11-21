const config = require("../app/config");
const MongoDB = require("../app/utils/mongodb.util");
const createIndexes = require("../app/utils/indexes");

async function main() {
    const msnvQuanLy = process.argv[2];
    if (!msnvQuanLy) {
        console.log("Cách dùng: node scripts/migrate-v2.js <MSNV_QuanLy>");
        process.exit(1);
        return;
    }

    try {
        await MongoDB.connect(config.db.uri);
        const db = MongoDB.client.db();

        // Tạo các index mới (idempotent)
        await createIndexes(MongoDB.client);

        // 1. Cập nhật ChucVu cho nhân viên hiện có
        const nhanvienCol = db.collection("nhanvien");
        const allNV = await nhanvienCol.find({}).toArray();
        for (const nv of allNV) {
            const chucVu = nv.MSNV === msnvQuanLy ? "QuanLy" : "NhanVien";
            const update = { ChucVu: chucVu };
            // Chuẩn hóa Email nếu có
            if (typeof nv.Email === "string") {
                update.Email = nv.Email.trim().toLowerCase();
            }
            await nhanvienCol.updateOne({ _id: nv._id }, { $set: update });
        }
        console.log(`Đã cập nhật ChucVu cho ${allNV.length} nhân viên (QuanLy: ${msnvQuanLy}).`);

        // Kiểm tra QuanLy được chỉ định tồn tại
        const ql = await nhanvienCol.findOne({ MSNV: msnvQuanLy });
        if (!ql) {
            console.warn(`CẢNH BÁO: không tìm thấy nhân viên MSNV="${msnvQuanLy}". Vui lòng kiểm tra lại.`);
        }

        // 2. Tạo/cập nhật bộ đếm docgia (idempotent, không giảm seq nếu đã cao hơn)
        const docgiaCol = db.collection("docgia");
        const docgias = await docgiaCol.find({ MaDocGia: { $regex: /^DG\d+$/ } }).toArray();
        let maxSeq = 0;
        for (const dg of docgias) {
            const m = dg.MaDocGia.match(/^DG(\d+)$/);
            if (m) {
                const n = parseInt(m[1], 10);
                if (n > maxSeq) maxSeq = n;
            }
        }
        const counters = db.collection("counters");
        await counters.updateOne(
            { _id: "docgia" },
            { $setOnInsert: { _id: "docgia" }, $max: { seq: maxSeq } },
            { upsert: true }
        );
        const counter = await counters.findOne({ _id: "docgia" });
        console.log(`Bộ đếm docgia: seq = ${counter.seq} (max mã hiện có DG${String(maxSeq).padStart(4, "0")}).`);

        console.log("Migration v2 hoàn tất.");
    } catch (error) {
        console.error("Lỗi migration:", error);
        process.exitCode = 1;
    } finally {
        if (MongoDB.client) {
            await MongoDB.client.close();
        }
    }
}

main();
