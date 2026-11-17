const NhaXuatBanService = require('../services/nhaxuatban.service');
const MongoDB = require('../utils/mongodb.util');
const ApiError = require('../api-error');

// Them mot nha xuat ban 
exports.create = async (req, res, next) => {
    if (!req.body?.MaNXB) {
        return next(new ApiError(400, " Mã NXB không được để trống"));
    }
    if (!req.body?.TenNXB) {
        return next(new ApiError(400, "Tên NXB không được để trống"));
    }
    try {
        const service = new NhaXuatBanService(MongoDB.client);
        const existed = await service.findByMa(req.body.MaNXB);
        if (existed) {
            return next(new ApiError(400, "Mã NXB đã tồn tại"));
        }
        const document = await service.create(req.body);
        return res.send(document);
    } catch (error) {
        console.log(error);
        return next(
            new ApiError(500, "Lỗi khi tạo nhà xuất bản"));
    }
};

exports.findAll = async (req, res, next) => {
    try {
        const service = new NhaXuatBanService(MongoDB.client);
        const { name } = req.query;
        const documents = name
            ? await service.findByName(name)
            : await service.find({});
        return res.send(documents);
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi truy xuất nhà xuất bản"));
    }
};

exports.findOne = async (req, res, next) => {
    try {
        const service = new NhaXuatBanService(MongoDB.client);
        const document = await service.findById(req.params.id);
        if (!document) {
            return next(new ApiError(404, "Không tìm thấy nhà xuất bản"));
        }
        return res.send(document);
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, " Lỗi khi truy xuất nhà xuất bản"));
    }
};

exports.update = async (req, res, next) => {
    if (Object.keys(req.body).length === 0) {
        return next(new ApiError(400, "Dữ liệu để cập nhật không được để trống"));
    }

    try {
        const service = new NhaXuatBanService(MongoDB.client);
        const document = await service.update(req.params.id, req.body);
        if (!document) {
            return next(new ApiError(404, "Không tìm thấy nhà xuất bản"));
        }
        return res.send({ message: "Cập nhật nhà xuất bản thành công" });
    } catch (error) {
        return next(new ApiError(500, `Lỗi khi cập nhật nhà xuất bản id = ${req.params.id}`));
    }
};

exports.delete = async (req, res, next) => {
    try {
        const service = new NhaXuatBanService(MongoDB.client);
        const nxb = await service.findById(req.params.id);
        if (!nxb) {
            return next(new ApiError(404, "Không tìm thấy nhà xuất bản"));
        }

        // Không xóa nhà xuất bản còn sách tham chiếu
        const sach = MongoDB.client.db().collection("sach");
        const soSach = await sach.countDocuments({ MaNXB: nxb.MaNXB });
        if (soSach > 0) {
            return next(new ApiError(409, "Không thể xóa nhà xuất bản đang có sách tham chiếu"));
        }

        const document = await service.delete(req.params.id);
        if (!document) {
            return next(new ApiError(404, "Không tìm thấy nhà xuất bản"));
        }
        return res.send({ message: "Xóa nhà xuất bản thành công" });
    } catch (error) {
        console.log(error);
        return next(
            new ApiError(500, `Lỗi khi xóa nhà xuất bản id = ${req.params.id}`));
    }
};
