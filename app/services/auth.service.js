const DocGiaService = require("./docgia.service");
const NhanVienService = require("./nhanvien.service");

// Lấy service và tìm tài khoản theo vai trò và mã đăng nhập
async function findAccountByMa(client, role, ma) {
    if (role === "nhanvien") {
        const service = new NhanVienService(client);
        return await service.findByMa(ma);
    }
    if (role === "docgia") {
        const service = new DocGiaService(client);
        return await service.findByMa(ma);
    }
    return null;
}

// Lấy thông tin người dùng (không có Password) theo vai trò và id
async function findUserById(client, role, id) {
    if (role === "nhanvien") {
        const service = new NhanVienService(client);
        return await service.findById(id);
    }
    if (role === "docgia") {
        const service = new DocGiaService(client);
        return await service.findById(id);
    }
    return null;
}

// Lấy tài khoản đầy đủ (có Password) để kiểm tra/đổi mật khẩu
async function findUserWithPassword(client, role, id) {
    if (role === "nhanvien") {
        const service = new NhanVienService(client);
        return await service.findByIdWithPassword(id);
    }
    if (role === "docgia") {
        const service = new DocGiaService(client);
        return await service.findByIdWithPassword(id);
    }
    return null;
}

// Cập nhật mật khẩu đã băm cho tài khoản
async function updatePassword(client, role, id, hashedPassword) {
    if (role === "nhanvien") {
        const service = new NhanVienService(client);
        return await service.update(id, { Password: hashedPassword });
    }
    if (role === "docgia") {
        const service = new DocGiaService(client);
        return await service.update(id, { Password: hashedPassword });
    }
    return null;
}

module.exports = {
    findAccountByMa,
    findUserById,
    findUserWithPassword,
    updatePassword,
};
