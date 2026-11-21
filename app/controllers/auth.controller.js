const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config");
const MongoDB = require("../utils/mongodb.util");
const ApiError = require("../api-error");
const AuthService = require("../services/auth.service");
const DocGiaService = require("../services/docgia.service");
const NhanVienService = require("../services/nhanvien.service");
const { ObjectId } = require("mongodb");

// Đăng nhập: trả token và thông tin người dùng (không có Password)
exports.login = async (req, res, next) => {
    const { role, ma, password } = req.body || {};

    if (role !== "nhanvien" && role !== "docgia") {
        return next(new ApiError(400, "Vai trò không hợp lệ"));
    }
    if (!ma || !password) {
        return next(new ApiError(400, "Vui lòng nhập mã và mật khẩu"));
    }

    try {
        const account = await AuthService.findAccountByMa(MongoDB.client, role, ma);

        if (!account) {
            return next(new ApiError(401, "Sai mã hoặc mật khẩu"));
        }

        const isMatch = await bcrypt.compare(password, account.Password || "");
        if (!isMatch) {
            return next(new ApiError(401, "Sai mã hoặc mật khẩu"));
        }

        const token = jwt.sign(
            { id: String(account._id), ma, role },
            config.auth.jwtSecret,
            { expiresIn: config.auth.jwtExpires }
        );

        const { Password, ...user } = account;
        return res.send({ token, user });
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi đăng nhập"));
    }
};

// Lấy thông tin người đang đăng nhập từ database
exports.me = async (req, res, next) => {
    try {
        const { id, role } = req.user;
        const user = await AuthService.findUserById(MongoDB.client, role, id);

        if (!user) {
            return next(new ApiError(401, "Tài khoản không tồn tại"));
        }

        return res.send(user);
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi truy xuất thông tin người dùng"));
    }
};

// Đổi mật khẩu người đang đăng nhập
exports.doiMatKhau = async (req, res, next) => {
    const { matKhauCu, matKhauMoi } = req.body || {};
    if (!matKhauCu || !matKhauMoi) {
        return next(new ApiError(400, "Vui lòng nhập mật khẩu cũ và mật khẩu mới"));
    }
    if (matKhauMoi.length < 6) {
        return next(new ApiError(400, "Mật khẩu mới phải có ít nhất 6 ký tự"));
    }

    try {
        const { id, role } = req.user;
        const account = await AuthService.findUserWithPassword(MongoDB.client, role, id);

        if (!account) {
            return next(new ApiError(401, "Tài khoản không tồn tại"));
        }

        const isMatch = await bcrypt.compare(matKhauCu, account.Password || "");
        if (!isMatch) {
            return next(new ApiError(400, "Mật khẩu cũ không đúng"));
        }

        const sameAsOld = await bcrypt.compare(matKhauMoi, account.Password || "");
        if (sameAsOld) {
            return next(new ApiError(400, "Mật khẩu mới phải khác mật khẩu cũ"));
        }

        const hashedPassword = await bcrypt.hash(matKhauMoi, 10);
        const updated = await AuthService.updatePassword(MongoDB.client, role, id, hashedPassword);
        if (!updated) {
            return next(new ApiError(401, "Tài khoản không tồn tại"));
        }

        return res.send({ message: "Đổi mật khẩu thành công" });
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi đổi mật khẩu"));
    }
};

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeEmail(email) {
    if (email === undefined || email === null) return undefined;
    const s = String(email).trim().toLowerCase();
    return s === "" ? undefined : s;
}

function phoneValid(phone) {
    return /^(09|03|07|08|05)[0-9]{8}$/.test(phone);
}

// Sinh MaDocGia bằng collection counters, thử lại tối đa 5 lần nếu trùng
async function generateMaDocGia() {
    const db = MongoDB.client.db();
    const counters = db.collection("counters");
    const docgiaCol = db.collection("docgia");
    for (let i = 0; i < 5; i++) {
        const result = await counters.findOneAndUpdate(
            { _id: "docgia" },
            { $inc: { seq: 1 } },
            { upsert: true, returnDocument: "after" }
        );
        const seq = result ? result.seq : null;
        if (seq === null || seq === undefined) {
            throw new Error("Không sinh được mã độc giả");
        }
        const ma = "DG" + String(seq).padStart(4, "0");
        const existed = await docgiaCol.findOne({ MaDocGia: ma });
        if (!existed) return ma;
    }
    throw new Error("Không sinh được mã độc giả duy nhất");
}

// Đăng ký độc giả công khai
exports.dangKy = async (req, res, next) => {
    const body = req.body || {};
    const HoLot = body.HoLot;
    const Ten = body.Ten;
    const Email = normalizeEmail(body.Email);
    const Password = body.Password;

    if (!HoLot) {
        return next(new ApiError(400, "Họ lót không được để trống"));
    }
    if (!Ten) {
        return next(new ApiError(400, "Tên không được để trống"));
    }
    if (!Email) {
        return next(new ApiError(400, "Email không được để trống"));
    }
    if (!isValidEmail(Email)) {
        return next(new ApiError(400, "Email không hợp lệ"));
    }
    if (!Password || Password.length < 6) {
        return next(new ApiError(400, "Mật khẩu bắt buộc và phải có ít nhất 6 ký tự"));
    }
    if (body.DienThoai && !phoneValid(body.DienThoai)) {
        return next(new ApiError(400, "Số điện thoại không hợp lệ"));
    }
    if (body.Phai !== undefined && body.Phai !== "" && body.Phai !== "Nam" && body.Phai !== "Nu") {
        return next(new ApiError(400, "Phái chỉ được là \"Nam\" hoặc \"Nu\""));
    }

    try {
        const service = new DocGiaService(MongoDB.client);
        const existedEmail = await service.findByEmail(Email);
        if (existedEmail) {
            return next(new ApiError(409, "Email đã được sử dụng"));
        }

        let ngaySinh = undefined;
        if (body.NgaySinh !== undefined && body.NgaySinh !== "") {
            const d = new Date(body.NgaySinh);
            if (isNaN(d.getTime())) {
                return next(new ApiError(400, "Ngày sinh không hợp lệ"));
            }
            ngaySinh = d;
        }

        const hashedPassword = await bcrypt.hash(Password, 10);
        const maDocGia = await generateMaDocGia();

        const data = {
            MaDocGia: maDocGia,
            HoLot,
            Ten,
            Email,
            Password: hashedPassword,
            SoLanViPham: 0,
            NgayDangKy: new Date(),
        };
        if (ngaySinh) data.NgaySinh = ngaySinh;
        if (body.Phai) data.Phai = body.Phai;
        if (body.DiaChi) data.DiaChi = body.DiaChi;
        if (body.DienThoai) data.DienThoai = body.DienThoai;

        await service.create(data);
        return res.send({ MaDocGia: maDocGia, message: "Đăng ký thành công" });
    } catch (error) {
        console.log(error);
        if (error && error.code === 11000) {
            return next(new ApiError(409, "Email đã được sử dụng"));
        }
        return next(new ApiError(500, "Lỗi khi đăng ký độc giả"));
    }
};

// Hồ sơ cá nhân (đã đăng nhập)
exports.hoSo = async (req, res, next) => {
    const { id, role } = req.user;
    const body = req.body || {};

    try {
        if (role === "docgia") {
            const service = new DocGiaService(MongoDB.client);
            const current = await service.findByIdWithPassword(id);
            if (!current) {
                return next(new ApiError(404, "Không tìm thấy độc giả"));
            }

            const data = {};
            if (body.HoLot !== undefined) data.HoLot = body.HoLot;
            if (body.Ten !== undefined) data.Ten = body.Ten;
            if (body.Phai !== undefined) {
                if (body.Phai !== "" && body.Phai !== "Nam" && body.Phai !== "Nu") {
                    return next(new ApiError(400, "Phái chỉ được là \"Nam\" hoặc \"Nu\""));
                }
                if (body.Phai !== "") data.Phai = body.Phai;
            }
            if (body.DiaChi !== undefined) data.DiaChi = body.DiaChi;
            if (body.DienThoai !== undefined) {
                if (body.DienThoai !== "" && !phoneValid(body.DienThoai)) {
                    return next(new ApiError(400, "Số điện thoại không hợp lệ"));
                }
                if (body.DienThoai !== "") data.DienThoai = body.DienThoai;
            }
            if (body.NgaySinh !== undefined) {
                if (body.NgaySinh === "") {
                    // keep
                } else {
                    const d = new Date(body.NgaySinh);
                    if (isNaN(d.getTime())) {
                        return next(new ApiError(400, "Ngày sinh không hợp lệ"));
                    }
                    data.NgaySinh = d;
                }
            }
            if (body.Email !== undefined) {
                const email = normalizeEmail(body.Email);
                if (email) {
                    if (!isValidEmail(email)) {
                        return next(new ApiError(400, "Email không hợp lệ"));
                    }
                    const existed = await service.findByEmail(email);
                    if (existed && String(existed._id) !== String(current._id)) {
                        return next(new ApiError(409, "Email đã được sử dụng"));
                    }
                    data.Email = email;
                }
            }

            const document = await service.update(id, data);
            if (!document) {
                return next(new ApiError(404, "Không tìm thấy độc giả"));
            }
            return res.send({ message: "Cập nhật hồ sơ thành công" });
        }

        if (role === "nhanvien") {
            const service = new NhanVienService(MongoDB.client);
            const current = await service.findById(id);
            if (!current) {
                return next(new ApiError(404, "Không tìm thấy nhân viên"));
            }

            const data = {};
            if (body.HoTenNV !== undefined) data.HoTenNV = body.HoTenNV;
            if (body.DiaChi !== undefined) data.DiaChi = body.DiaChi;
            if (body.SoDienThoai !== undefined) {
                if (body.SoDienThoai !== "" && !phoneValid(body.SoDienThoai)) {
                    return next(new ApiError(400, "Số điện thoại không hợp lệ"));
                }
                if (body.SoDienThoai !== "") data.SoDienThoai = body.SoDienThoai;
            }
            if (body.Email !== undefined) {
                const email = normalizeEmail(body.Email);
                if (email) {
                    if (!isValidEmail(email)) {
                        return next(new ApiError(400, "Email không hợp lệ"));
                    }
                    const existed = await service.findByEmail(email);
                    if (existed && String(existed._id) !== String(current._id)) {
                        return next(new ApiError(409, "Email đã được sử dụng"));
                    }
                    data.Email = email;
                }
            }

            const document = await service.update(id, data);
            if (!document) {
                return next(new ApiError(404, "Không tìm thấy nhân viên"));
            }
            return res.send({ message: "Cập nhật hồ sơ thành công" });
        }

        return next(new ApiError(403, "Vai trò không hợp lệ"));
    } catch (error) {
        console.log(error);
        if (error && error.code === 11000) {
            return next(new ApiError(409, "Email đã được sử dụng"));
        }
        return next(new ApiError(500, "Lỗi khi cập nhật hồ sơ"));
    }
};

const mailUtil = require("../utils/mail.util");

// Quên mật khẩu
exports.quenMatKhau = async (req, res, next) => {
    const body = req.body || {};
    const role = body.role;
    const email = normalizeEmail(body.email);
    const message = "Nếu email tồn tại trong hệ thống, hướng dẫn đã được gửi";

    // Luôn trả 200 cùng một câu
    try {
        if (role === "docgia" || role === "nhanvien") {
            const db = MongoDB.client.db();
            const collection = role === "docgia" ? "docgia" : "nhanvien";
            const codeField = role === "docgia" ? "MaDocGia" : "MSNV";
            const service = role === "docgia" ? new DocGiaService(MongoDB.client) : new NhanVienService(MongoDB.client);

            const account = email ? await service.findByEmail(email) : null;
            if (account) {
                const ma = account[codeField];
                const minInterval = config.reset.minIntervalSeconds * 1000;
                const now = new Date();
                const recent = await db.collection("datlaimatkhau").findOne({
                    Role: role,
                    Ma: ma,
                    UsedAt: null,
                    CreatedAt: { $gte: new Date(now.getTime() - minInterval) },
                });
                if (!recent) {
                    // Xóa các yêu cầu chưa dùng cũ
                    await db.collection("datlaimatkhau").deleteMany({ Role: role, Ma: ma, UsedAt: null });
                    const token = crypto.randomBytes(32).toString("hex");
                    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
                    const expiresAt = new Date(now.getTime() + config.reset.tokenMinutes * 60 * 1000);
                    await db.collection("datlaimatkhau").insertOne({
                        Role: role,
                        Ma: ma,
                        TokenHash: tokenHash,
                        ExpiresAt: expiresAt,
                        UsedAt: null,
                        CreatedAt: now,
                    });
                    const link = `${config.app.clientUrl}/dat-lai-mat-khau?token=${token}`;
                    const text = `Mã tài khoản của bạn: ${ma}\nLiên kết đặt lại mật khẩu (hiệu lực ${config.reset.tokenMinutes} phút): ${link}\nNếu bạn không yêu cầu, hãy bỏ qua email này.`;
                    await mailUtil.sendMail({
                        to: email,
                        subject: "Đặt lại mật khẩu",
                        text,
                    });
                }
            }
        }
    } catch (error) {
        console.log(error);
    }

    return res.send({ message });
};

// Đặt lại mật khẩu
exports.datLaiMatKhau = async (req, res, next) => {
    const body = req.body || {};
    const token = body.token;
    const matKhauMoi = body.matKhauMoi;

    if (!token) {
        return next(new ApiError(400, "Liên kết không hợp lệ hoặc đã hết hạn"));
    }
    if (!matKhauMoi || matKhauMoi.length < 6) {
        return next(new ApiError(400, "Mật khẩu mới phải có ít nhất 6 ký tự"));
    }

    try {
        const db = MongoDB.client.db();
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const reqDoc = await db.collection("datlaimatkhau").findOne({
            TokenHash: tokenHash,
            UsedAt: null,
            ExpiresAt: { $gt: new Date() },
        });
        if (!reqDoc) {
            return next(new ApiError(400, "Liên kết không hợp lệ hoặc đã hết hạn"));
        }

        const role = reqDoc.Role;
        const ma = reqDoc.Ma;
        const hashedPassword = await bcrypt.hash(matKhauMoi, 10);

        if (role === "docgia") {
            const service = new DocGiaService(MongoDB.client);
            const account = await service.findByMa(ma);
            if (!account) {
                return next(new ApiError(400, "Liên kết không hợp lệ hoặc đã hết hạn"));
            }
            await service.update(account._id, { Password: hashedPassword });
        } else if (role === "nhanvien") {
            const service = new NhanVienService(MongoDB.client);
            const account = await service.findByMa(ma);
            if (!account) {
                return next(new ApiError(400, "Liên kết không hợp lệ hoặc đã hết hạn"));
            }
            await service.update(account._id, { Password: hashedPassword });
        } else {
            return next(new ApiError(400, "Liên kết không hợp lệ hoặc đã hết hạn"));
        }

        await db.collection("datlaimatkhau").updateOne(
            { _id: reqDoc._id },
            { $set: { UsedAt: new Date() } }
        );

        return res.send({ message: "Đặt lại mật khẩu thành công" });
    } catch (error) {
        console.log(error);
        return next(new ApiError(500, "Lỗi khi đặt lại mật khẩu"));
    }
};