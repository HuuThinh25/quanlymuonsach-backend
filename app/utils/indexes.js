// Chú thích: Tạo unique index để đảm bảo tính duy nhất cho các trường mã (MaNXB, MaSach, MaDocGia, MSNV)
// ở cấp cơ sở dữ liệu MongoDB, giúp ngăn chặn dữ liệu bị trùng lặp ngay cả khi có nhiều yêu cầu xử lý đồng thời.

async function createIndexes(client) {
    try {
        const db = client.db();
        await db.collection("nhaxuatban").createIndex({ MaNXB: 1 }, { unique: true });
        await db.collection("sach").createIndex({ MaSach: 1 }, { unique: true });
        await db.collection("docgia").createIndex({ MaDocGia: 1 }, { unique: true });
        await db.collection("nhanvien").createIndex({ MSNV: 1 }, { unique: true });
    } catch (error) {
        console.error("Tạo unique index thất bại (có thể do dữ liệu cũ đang trùng mã):", error);
        throw error;
    }
}

module.exports = createIndexes;
