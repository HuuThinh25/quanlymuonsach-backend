// Chú thích: Tạo unique index để đảm bảo tính duy nhất cho các trường mã (MaNXB, MaSach, MaDocGia, MSNV)
// ở cấp cơ sở dữ liệu MongoDB, giúp ngăn chặn dữ liệu bị trùng lặp ngay cả khi có nhiều yêu cầu xử lý đồng thời.
// Phiên bản 2: thêm partial unique index cho Email (chỉ khi Email là chuỗi) và TTL index cho datlaimatkhau.

async function createIndexes(client) {
    try {
        const db = client.db();
        await db.collection("nhaxuatban").createIndex({ MaNXB: 1 }, { unique: true });
        await db.collection("sach").createIndex({ MaSach: 1 }, { unique: true });
        await db.collection("docgia").createIndex({ MaDocGia: 1 }, { unique: true });
        await db.collection("nhanvien").createIndex({ MSNV: 1 }, { unique: true });

        // Partial unique index cho Email: chỉ áp dụng khi Email là chuỗi (bỏ qua null/undefined)
        await db.collection("docgia").createIndex(
            { Email: 1 },
            { unique: true, partialFilterExpression: { Email: { $type: "string" } } }
        );
        await db.collection("nhanvien").createIndex(
            { Email: 1 },
            { unique: true, partialFilterExpression: { Email: { $type: "string" } } }
        );

        // TTL index tự xóa yêu cầu đặt lại mật khẩu hết hạn
        await db.collection("datlaimatkhau").createIndex({ ExpiresAt: 1 }, { expireAfterSeconds: 0 });
    } catch (error) {
        console.error("Tạo unique index thất bại (có thể do dữ liệu cũ đang trùng mã):", error);
        throw error;
    }
}

module.exports = createIndexes;
