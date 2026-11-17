const bcrypt = require("bcryptjs");
const config = require("../app/config");
const MongoDB = require("../app/utils/mongodb.util");
const NhanVienService = require("../app/services/nhanvien.service");

async function main() {
    const [msnv, matKhau, ...hoTenParts] = process.argv.slice(2);
    const hoTenNV = hoTenParts.join(" ");

    if (!msnv || !matKhau || !hoTenNV) {
        console.log("Cách dùng: node scripts/seed-nhanvien.js <MSNV> <matkhau> <HoTenNV>");
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
        });
        console.log(`Đã tạo nhân viên "${msnv}" thành công.`);
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