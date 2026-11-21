const bcrypt = require("bcryptjs");
const config = require("../app/config");
const MongoDB = require("../app/utils/mongodb.util");
const NhanVienService = require("../app/services/nhanvien.service");

async function main() {
    const [msnv, matKhau, ...rest] = process.argv.slice(2);
    // HoTenNV có thể gồm nhiều từ; ChucVu là tham số cuối nếu là QuanLy/NhanVien
    let chucVu = "NhanVien";
    let hoTenNV = rest.join(" ");
    if (rest.length > 0 && (rest[rest.length - 1] === "QuanLy" || rest[rest.length - 1] === "NhanVien")) {
        chucVu = rest.pop();
        hoTenNV = rest.join(" ");
    }

    if (!msnv || !matKhau || !hoTenNV) {
        console.log("Cách dùng: node scripts/seed-nhanvien.js <MSNV> <matkhau> <HoTenNV> [ChucVu=QuanLy|NhanVien]");
        return;
    }

    try {
        await MongoDB.connect(config.db.uri);
        const service = new NhanVienService(MongoDB.client);

        const existed = await service.findByMa(msnv);
        if (existed) {
            console.log(`Nhân viên có MSNV "${msnv}" đã tồn tại, không tạo mới.`);
            return;
        }

        // Băm mật khẩu trước khi lưu
        const hashedPassword = await bcrypt.hash(matKhau, 10);
        await service.create({
            MSNV: msnv,
            HoTenNV: hoTenNV,
            Password: hashedPassword,
            ChucVu: chucVu,
        });
        console.log(`Đã tạo nhân viên "${msnv}" (ChucVu: ${chucVu}) thành công.`);
    } catch (error) {
        console.error("Lỗi khi tạo nhân viên:", error);
        process.exitCode = 1;
    } finally {
        if (MongoDB.client) {
            await MongoDB.client.close();
        }
    }
}

main();
