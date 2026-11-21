# ĐẶC TẢ HỆ THỐNG: QUẢN LÝ MƯỢN SÁCH (CT449) - PHIÊN BẢN 2

Tài liệu này là nguồn sự thật duy nhất cho đồ án. Mọi code phải khớp với tài liệu này.
Khi cần thay đổi thiết kế, sửa tài liệu này trước rồi mới sửa code.

Phiên bản 2 khác phiên bản 1 ở: phân cấp nhân viên (QuanLy, NhanVien), độc giả tự đăng ký
(mã tự sinh), thêm trường Email và chức năng quên mật khẩu qua email, danh mục sách công khai,
trang tổng quan cho nhân viên.

## 1. Phạm vi

Làm (lõi):
1. CRUD: nhà xuất bản, sách. Quản lý nhân viên (chỉ QuanLy). Độc giả: nhân viên chỉ xem, tìm, xóa dấu xấu.
2. Đăng nhập hai loại tài khoản trên MỘT trang (hai thẻ: Độc giả, Nhân viên), phân quyền ở backend, đổi mật khẩu.
3. Độc giả tự đăng ký, mã độc giả tự sinh. Quên mật khẩu bằng email. Hồ sơ cá nhân.
4. Mượn/trả: độc giả gửi yêu cầu, nhân viên duyệt hoặc từ chối, ghi trả, có hạn trả.
5. Cơ chế dấu xấu: đủ 3 dấu thì không được mượn nữa.
6. Giới hạn số sách mượn cùng lúc.
7. Danh mục sách công khai (khách chưa đăng nhập xem được), tìm kiếm và lọc.
8. Trang tổng quan nhỏ cho nhân viên (thẻ số liệu và danh sách việc cần làm, KHÔNG có biểu đồ).

KHÔNG làm (nhóm C, chỉ làm khi được yêu cầu rõ): biểu đồ, ảnh bìa, xuất Excel/PDF, khóa tài khoản,
gia hạn, tiền phạt, xác minh email khi đăng ký, đăng nhập bằng email, thông báo realtime,
phân trang phía server.

## 2. Hằng số cấu hình (backend/app/config/index.js)

| Tên | Giá trị | Ý nghĩa |
|---|---|---|
| `rules.maxViolations` | 3 | Đủ số dấu xấu này thì bị cấm mượn |
| `rules.maxBorrowAtOnce` | 5 | Số phiếu tối đa đang ChoDuyet + DangMuon của một độc giả |
| `rules.borrowDays` | 14 | Số ngày mượn mặc định, dùng tính HanTra |
| `rules.lowStock` | 2 | Sách có SoQuyenCon <= số này được coi là sắp hết |
| `auth.jwtSecret` | từ biến môi trường `JWT_SECRET` | Khóa ký token |
| `auth.jwtExpires` | "8h" | Thời hạn token |
| `reset.tokenMinutes` | 30 | Thời hạn liên kết đặt lại mật khẩu |
| `reset.minIntervalSeconds` | 60 | Khoảng cách tối thiểu giữa hai lần yêu cầu cho cùng một tài khoản |
| `app.clientUrl` | từ `CLIENT_URL`, mặc định `http://localhost:3001` | Dùng dựng liên kết trong email |
| `mail.*` | từ biến môi trường `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Cấu hình gửi email |

Bí mật (JWT_SECRET, SMTP_PASS...) đặt trong file `backend/.env`. File này PHẢI nằm trong `.gitignore`, không bao giờ commit.

## 3. Lược đồ dữ liệu (MongoDB, database `quanlymuonsach`)

Quy ước: `_id` là khóa kỹ thuật. Các mã (MaNXB, MaSach, MaDocGia, MSNV) là chuỗi duy nhất,
có unique index. Ngày lưu kiểu Date. Email lưu chữ thường, đã cắt khoảng trắng.

### nhaxuatban
| Trường | Kiểu | Ghi chú |
|---|---|---|
| MaNXB | string | duy nhất, bắt buộc |
| TenNXB | string | bắt buộc |
| DiaChi | string | |

### sach
| Trường | Kiểu | Ghi chú |
|---|---|---|
| MaSach | string | duy nhất, bắt buộc |
| TenSach | string | bắt buộc |
| DonGia | number | >= 0 |
| SoQuyen | number | tổng số quyển, số nguyên >= 0 |
| SoQuyenCon | number | số quyển còn cho mượn, 0 <= SoQuyenCon <= SoQuyen |
| NamXuatBan | number | |
| MaNXB | string | phải tồn tại trong nhaxuatban |
| NguonGocTacGia | string | gộp "Nguồn gốc/Tác giả" của đề |
| TheLoai | string | để lọc |

Khi tạo sách: SoQuyenCon = SoQuyen.
Khi sửa SoQuyen: SoQuyenCon thay đổi cùng chênh lệch, không được âm (nếu âm thì trả 400).

### docgia
| Trường | Kiểu | Ghi chú |
|---|---|---|
| MaDocGia | string | duy nhất, TỰ SINH dạng `DG0001`, dùng để đăng nhập, không sửa được |
| HoLot | string | bắt buộc |
| Ten | string | bắt buộc |
| NgaySinh | Date | |
| Phai | string | "Nam" hoặc "Nu" |
| DiaChi | string | |
| DienThoai | string | |
| Email | string | bắt buộc khi đăng ký mới, duy nhất (unique index một phần: chỉ áp dụng khi Email là chuỗi) |
| Password | string | băm bcrypt, KHÔNG BAO GIỜ trả về client |
| SoLanViPham | number | mặc định 0, chỉ hệ thống và nhân viên (xóa dấu xấu) được đổi |
| NgayDangKy | Date | lúc đăng ký |

Tài khoản độc giả cũ (tạo trước phiên bản 2) có thể chưa có Email. Họ vẫn đăng nhập bằng mã và bổ sung Email trong Hồ sơ.

### nhanvien
| Trường | Kiểu | Ghi chú |
|---|---|---|
| MSNV | string | duy nhất, bắt buộc, do QuanLy nhập, dùng để đăng nhập |
| HoTenNV | string | bắt buộc |
| Password | string | băm bcrypt, KHÔNG BAO GIỜ trả về client |
| ChucVu | string | CHỈ nhận `QuanLy` hoặc `NhanVien`, dùng để phân quyền |
| DiaChi | string | |
| SoDienThoai | string | |
| Email | string | tùy chọn nhưng cần có thì mới dùng được quên mật khẩu, duy nhất khi có (unique index một phần) |

### theodoimuonsach (một phiếu = một độc giả mượn một sách)
| Trường | Kiểu | Ghi chú |
|---|---|---|
| MaDocGia | string | bắt buộc |
| MaSach | string | bắt buộc |
| NgayYeuCau | Date | lúc tạo phiếu |
| NgayMuon | Date | lúc được duyệt hoặc lập trực tiếp |
| HanTra | Date | NgayMuon + borrowDays |
| NgayTra | Date | lúc ghi trả, ban đầu null |
| TrangThai | string | `ChoDuyet`, `DangMuon`, `DaTra`, `TuChoi` |
| MSNV | string | nhân viên xử lý (duyệt, từ chối hoặc ghi trả) |
| TinhTrangSach | string | `BinhThuong` hoặc `Hong`, điền khi ghi trả |
| ViPham | string | `QuaHan`, `HuHong` hoặc rỗng |

"Quá hạn" KHÔNG lưu thành trạng thái. Tính khi cần: TrangThai là DangMuon và HanTra < hiện tại.

Tên collection là `theodoimuonsach`. Tên file và đường dẫn API dùng `muonsach` cho ngắn.

### counters (bộ đếm sinh mã)
Một tài liệu `{ _id: "docgia", seq: <số> }`. Sinh mã bằng `findOneAndUpdate` với `$inc: { seq: 1 }`, `upsert: true`,
`returnDocument: "after"`. TUYỆT ĐỐI không dùng cách "đếm số dòng rồi cộng 1" (hai người đăng ký cùng lúc sẽ trùng mã).
Khởi tạo `seq` bằng số lớn nhất trong các MaDocGia dạng `DG<số>` đã có (script migrate làm việc này).
Nếu mã sinh ra đã bị trùng (do mã cũ nhập tay) thì sinh mã tiếp, tối đa 5 lần.

### datlaimatkhau (yêu cầu đặt lại mật khẩu)
| Trường | Kiểu | Ghi chú |
|---|---|---|
| Role | string | `docgia` hoặc `nhanvien` |
| Ma | string | MaDocGia hoặc MSNV |
| TokenHash | string | SHA-256 của token. CHỈ lưu bản băm, không lưu token gốc |
| ExpiresAt | Date | hết hạn (TTL index tự xóa) |
| UsedAt | Date | null cho đến khi dùng |
| CreatedAt | Date | |

## 4. Luật nghiệp vụ

### 4.1 Gửi yêu cầu mượn (độc giả) và lập phiếu trực tiếp (nhân viên)
Kiểm tra theo thứ tự, lỗi nào gặp trước trả về trước:
1. Độc giả tồn tại.
2. SoLanViPham >= maxViolations: 403, "Bạn đã bị 3 dấu xấu, không được mượn sách".
3. Có phiếu DangMuon quá hạn: 403, "Bạn đang giữ sách quá hạn, hãy trả trước".
4. Số phiếu ChoDuyet + DangMuon >= maxBorrowAtOnce: 403.
5. Sách tồn tại và SoQuyenCon > 0: nếu không, 409 "Sách đã hết".
6. Đã có phiếu ChoDuyet hoặc DangMuon cùng MaDocGia và MaSach: 409.

Độc giả gửi yêu cầu: tạo phiếu TrangThai = ChoDuyet, KHÔNG trừ SoQuyenCon.
Nhân viên lập trực tiếp: tạo phiếu TrangThai = DangMuon, đặt NgayMuon, HanTra, MSNV, và trừ SoQuyenCon (như mục 4.2).

### 4.2 Duyệt yêu cầu (nhân viên)
- Chỉ phiếu ChoDuyet mới duyệt được.
- Trừ SoQuyenCon bằng thao tác nguyên tử: findOneAndUpdate với điều kiện SoQuyenCon > 0 và $inc -1.
  Nếu không cập nhật được thì 409 "Sách đã hết", phiếu giữ nguyên.
- Đặt TrangThai = DangMuon, NgayMuon = hiện tại, HanTra = NgayMuon + borrowDays, MSNV.
- Kiểm tra lại các điều kiện 4.1 mục 2 đến 4 tại thời điểm duyệt.

### 4.3 Từ chối (nhân viên)
Chỉ phiếu ChoDuyet. Đặt TrangThai = TuChoi, MSNV. Không đổi SoQuyenCon.

### 4.4 Ghi trả (nhân viên)
- Chỉ phiếu DangMuon. Body có TinhTrangSach (`BinhThuong` hoặc `Hong`).
- Đặt TrangThai = DaTra, NgayTra = hiện tại, TinhTrangSach, MSNV.
- Cộng lại SoQuyenCon (+1, không vượt SoQuyen). Nếu sách Hong vẫn cộng lại (nhân viên tự xử lý sách hỏng ngoài hệ thống).
- Xác định vi phạm, MỖI PHIẾU TỐI ĐA 1 DẤU:
  - TinhTrangSach = Hong: ViPham = HuHong.
  - Ngược lại nếu NgayTra > HanTra: ViPham = QuaHan.
  - Có vi phạm thì tăng SoLanViPham của độc giả thêm 1.

### 4.5 Xóa dấu xấu (nhân viên, kể cả NhanVien)
Đặt SoLanViPham của một độc giả về 0.

### 4.6 Ràng buộc xóa
- Xóa nhà xuất bản còn sách tham chiếu: 409.
- Xóa sách còn phiếu ChoDuyet hoặc DangMuon: 409.
- Xóa độc giả (chỉ QuanLy) còn phiếu ChoDuyet hoặc DangMuon: 409.
- Không có API xóa toàn bộ bảng.

### 4.7 Phân cấp nhân viên
- `ChucVu` chỉ nhận `QuanLy` hoặc `NhanVien`. Giá trị khác: 400.
- Token mang `role: "nhanvien"` (giữ nguyên để các route cũ không đổi). Middleware `requireQuanLy` KIỂM TRA `ChucVu`
  TRONG DATABASE ở mỗi lần gọi (không tin ChucVu trong token), để quản lý bị hạ cấp mất quyền ngay.
- Chỉ QuanLy: xem, thêm, sửa, xóa tài khoản nhân viên; xóa độc giả.
- QuanLy không tự xóa chính mình, không tự hạ cấp chính mình.
- Luôn còn ít nhất một QuanLy: xóa hoặc hạ cấp QuanLy cuối cùng thì 409.
- NhanVien (thường): làm mọi việc về mượn/trả, sách, nhà xuất bản, xem và tìm độc giả, xóa dấu xấu.
  Không vào được API nhân viên (403), không xóa được độc giả (403).
- Mọi nhân viên tự đổi mật khẩu và sửa hồ sơ của chính mình (mục 4.10).
- Tài khoản QuanLy đầu tiên tạo bằng script seed (có tham số chức vụ).

### 4.8 Đăng ký độc giả (công khai)
- `POST /api/auth/dang-ky`, body: HoLot, Ten, NgaySinh, Phai, DiaChi, DienThoai, Email, Password.
- Bắt buộc: HoLot, Ten, Email (đúng định dạng), Password (>= 6 ký tự). DienThoai nếu có phải khớp /^(09|03|07|08|05)[0-9]{8}$/.
- Server tự sinh MaDocGia (xem counters). BỎ QUA mọi MaDocGia, SoLanViPham, NgayDangKy do client gửi.
- Email đã có độc giả khác dùng: 409.
- Trả về `{ MaDocGia, message }`. Không tự đăng nhập. Không trả Password.
- Email không được xác minh (hạn chế đã biết, ghi vào báo cáo).

### 4.9 Quên mật khẩu và đặt lại (công khai)
- `POST /api/auth/quen-mat-khau`, body `{ role, email }`. LUÔN trả 200 cùng một câu
  ("Nếu email tồn tại trong hệ thống, hướng dẫn đã được gửi"), dù có tìm thấy tài khoản hay không (không để lộ email nào tồn tại).
- Nếu tìm thấy tài khoản có Email khớp (đúng bảng theo role): nếu đã có yêu cầu của tài khoản đó trong vòng
  `reset.minIntervalSeconds` thì bỏ qua âm thầm. Ngược lại: xóa các yêu cầu chưa dùng cũ của tài khoản, sinh token ngẫu nhiên
  (`crypto.randomBytes(32).toString("hex")`), lưu SHA-256 của token với ExpiresAt = hiện tại + `reset.tokenMinutes`, rồi gửi email.
- Email gồm: mã tài khoản (MaDocGia hoặc MSNV, vì mã tự sinh dễ quên), liên kết
  `<clientUrl>/dat-lai-mat-khau?token=<token>`, và thời hạn hiệu lực.
- Chưa cấu hình SMTP (môi trường phát triển): in nội dung email, kể cả liên kết, ra console của backend. Chỉ in khi chưa cấu hình SMTP.
  Không bao giờ ghi token ra log trong trường hợp khác.
- `POST /api/auth/dat-lai-mat-khau`, body `{ token, matKhauMoi }`: băm token, tìm yêu cầu còn hạn và chưa dùng.
  Không hợp lệ: 400 "Liên kết không hợp lệ hoặc đã hết hạn". Hợp lệ: đặt mật khẩu mới (>= 6 ký tự, băm bcrypt),
  đánh dấu UsedAt, trả 200. Không tự đăng nhập.

### 4.10 Hồ sơ cá nhân
- `PUT /api/auth/ho-so` (đã đăng nhập). Độc giả sửa được: HoLot, Ten, NgaySinh, Phai, DiaChi, DienThoai, Email.
  Nhân viên sửa được: HoTenNV, DiaChi, SoDienThoai, Email. Không bao giờ sửa được: mã, ChucVu, SoLanViPham, Password.
- Email đổi sang giá trị người khác đang dùng: 409.
- Đổi mật khẩu dùng `PUT /api/auth/doi-mat-khau` (đã có).

### 4.11 Thống kê tổng quan (nhân viên)
`GET /api/thongke/tong-quan` trả: choDuyet, dangMuon, quaHan, docGiaBiCam (SoLanViPham >= maxViolations),
sachSapHet (SoQuyenCon <= lowStock), tongSach, tongDocGia, và `choDuyetMoiNhat` (tối đa 5 phiếu ChoDuyet mới nhất, kèm
tên sách và họ tên độc giả, không có Password).

## 5. Xác thực và phân quyền

- Mật khẩu băm bằng bcrypt. Token JWT chứa: `id` (_id), `ma` (MSNV hoặc MaDocGia), `role` (`nhanvien` hoặc `docgia`).
- Client gửi header `Authorization: Bearer <token>`.
- Middleware backend (app/middlewares/auth.middleware.js):
  - `requireAuth`: thiếu hoặc sai token thì 401.
  - `requireRole("nhanvien")` hoặc `requireRole("docgia")`: sai vai trò thì 403.
  - `requireQuanLy`: dùng sau requireRole("nhanvien"); đọc ChucVu từ database, không phải QuanLy thì 403.
- Độc giả chỉ xem được phiếu của chính mình (lọc theo MaDocGia trong token, không tin dữ liệu client gửi).
- Không bao giờ trả trường Password trong bất kỳ phản hồi nào.
- Route công khai (không cần đăng nhập): `/api/auth/login`, `/api/auth/dang-ky`, `/api/auth/quen-mat-khau`,
  `/api/auth/dat-lai-mat-khau`, và các GET của `/api/sach`, `/api/nhaxuatban`. Mọi route khác cần đăng nhập.
- Tài khoản nhân viên đầu tiên tạo bằng script `backend/scripts/seed-nhanvien.js`. Không có API đăng ký nhân viên công khai.

## 6. Danh sách API

Tiền tố `/api`. Cột Quyền: `-` công khai, `Mọi` đã đăng nhập, `DG` độc giả, `NV` nhân viên (cả hai chức vụ), `QL` chỉ QuanLy.

### Xác thực và tài khoản
| Method | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| POST | /auth/login | - | Body `{ role, ma, password }`. Trả `{ token, user }` (user không có Password) |
| POST | /auth/dang-ky | - | Đăng ký độc giả (mục 4.8) |
| POST | /auth/quen-mat-khau | - | Mục 4.9 |
| POST | /auth/dat-lai-mat-khau | - | Mục 4.9 |
| GET | /auth/me | Mọi | Thông tin người đang đăng nhập (độc giả kèm SoLanViPham, nhân viên kèm ChucVu) |
| PUT | /auth/ho-so | Mọi | Mục 4.10 |
| PUT | /auth/doi-mat-khau | Mọi | Body `{ matKhauCu, matKhauMoi }` |

### Nhà xuất bản
| Method | Đường dẫn | Quyền |
|---|---|---|
| GET | /nhaxuatban (`?name=`) | - |
| GET | /nhaxuatban/:id | - |
| POST | /nhaxuatban | NV |
| PUT | /nhaxuatban/:id | NV |
| DELETE | /nhaxuatban/:id | NV |

### Sách
| Method | Đường dẫn | Quyền |
|---|---|---|
| GET | /sach (`?name=&theloai=&manxb=&saphet=true`) | - |
| GET | /sach/:id | - |
| POST | /sach | NV |
| PUT | /sach/:id | NV |
| DELETE | /sach/:id | NV |

### Độc giả
Nhân viên KHÔNG tạo và KHÔNG sửa thông tin độc giả (độc giả tự đăng ký và tự sửa hồ sơ).

| Method | Đường dẫn | Quyền |
|---|---|---|
| GET | /docgia (`?name=&cam=true`) | NV |
| GET | /docgia/:id | NV |
| PUT | /docgia/:id/xoa-vi-pham | NV |
| DELETE | /docgia/:id | QL |

Route `/:id/xoa-vi-pham` PHẢI đứng trước `/:id`. `cam=true` lọc SoLanViPham >= maxViolations.

### Nhân viên
| Method | Đường dẫn | Quyền |
|---|---|---|
| GET | /nhanvien (`?name=`) | QL |
| GET | /nhanvien/:id | QL |
| POST | /nhanvien | QL |
| PUT | /nhanvien/:id | QL (nếu body có Password mới thì băm lại) |
| DELETE | /nhanvien/:id | QL |

### Mượn/trả
Thứ tự khai báo route: các đường cụ thể (`yeu-cau`, `cua-toi`) PHẢI đứng trước `/:id`.

| Method | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| POST | /muonsach/yeu-cau | DG | Body `{ MaSach }`. Mã độc giả lấy từ token |
| GET | /muonsach/cua-toi | DG | Phiếu của chính độc giả |
| POST | /muonsach | NV | Lập phiếu trực tiếp, body `{ MaDocGia, MaSach }` |
| GET | /muonsach (`?trangthai=&quahan=true`) | NV | Danh sách phiếu |
| PUT | /muonsach/:id/duyet | NV | Duyệt |
| PUT | /muonsach/:id/tu-choi | NV | Từ chối |
| PUT | /muonsach/:id/tra | NV | Ghi trả, body `{ TinhTrangSach }` |

### Thống kê
| Method | Đường dẫn | Quyền |
|---|---|---|
| GET | /thongke/tong-quan | NV |

## 7. Trang giao diện (Vue Router)

Một ứng dụng Vue. Thư viện giao diện: xem 7.1.

### 7.1 Thư viện giao diện

PrimeVue 4.5.5 (styled mode, theme Aura, giấy phép MIT), @primeuix/themes 2.0.3 và primeicons. Phiên bản được ghim,
không nâng lên bản 5 (giấy phép PrimeUI). Không dùng Bootstrap. Quy ước chi tiết ở `.clinerules`.
Thành phần dự kiến dùng: `DataTable`, `Column`, `Dialog`, `ConfirmDialog`, `Toast`, `Menubar`, `Card`, `Tag`, `Button`,
`InputText`, `Password`, `InputNumber`, `Select`, `DatePicker`, `SelectButton`, `Tabs` (hoặc SelectButton) cho hai thẻ đăng nhập.

Hai layout trong `src/layouts`: `ReaderLayout` (khách và độc giả) và `AdminLayout` (nhân viên). Mỗi layout có `Menubar`.
Menu chỉ chứa thứ cần điều hướng. Nội dung chính của trang chủ KHÔNG nằm trên menu.

### 7.2 Trang công khai
- `/login`: một trang, hai thẻ "Độc giả" (mặc định) và "Nhân viên". Thẻ Độc giả có liên kết "Chưa có tài khoản? Đăng ký".
  Cả hai thẻ có liên kết "Quên mật khẩu?". Thẻ Nhân viên không có đăng ký. Đăng nhập xong: nhân viên về `/admin`, độc giả về `/`.
- `/dang-ky`: form đăng ký (HoLot, Ten, NgaySinh, Phai, DiaChi, DienThoai, Email, Mật khẩu, Nhập lại mật khẩu).
  Thành công: hiện RÕ mã độc giả vừa được cấp ("Mã độc giả của bạn là DG0007, hãy ghi nhớ") kèm nút sang đăng nhập.
- `/quen-mat-khau`: chọn loại tài khoản và nhập email. Luôn hiện thông báo chung sau khi gửi.
- `/dat-lai-mat-khau?token=...`: nhập mật khẩu mới và nhắc lại. Thành công thì chuyển `/login`. Thiếu token hoặc token sai thì báo lỗi rõ.

### 7.3 Khách và độc giả (ReaderLayout)
- `/` (công khai, ai cũng xem được): DANH MỤC SÁCH. Tìm theo tên, lọc theo thể loại và nhà xuất bản. Mỗi cuốn là một thẻ:
  tên, tác giả, thể loại, nhà xuất bản, "còn n quyển", nút "Mượn".
  - Chưa đăng nhập bấm "Mượn": chuyển `/login`.
  - Độc giả: nút "Mượn" mờ khi sách hết hoặc khi bị cấm mượn; bấm thì gửi yêu cầu, hiện Toast kết quả, lỗi 403/409 hiện message của server.
  - Độc giả đăng nhập: phía trên danh mục có dải thông tin gọn: vi phạm n/3, số sách đang mượn, cảnh báo sách sắp hoặc đã quá hạn.
  - Nhân viên mở `/` thì được chuyển về `/admin`.
- `/lich-su-muon` (độc giả): phiếu của tôi, hiện trạng thái, hạn trả, cờ quá hạn, vi phạm.
- `/ho-so` (độc giả): hiện mã độc giả, sửa thông tin cá nhân và email, hiện vi phạm n/3, đổi mật khẩu.
- Menu: Danh mục sách; khi đã đăng nhập: Lịch sử mượn, Hồ sơ, tên người dùng và Đăng xuất; khi chưa: Đăng nhập, Đăng ký.

### 7.4 Nhân viên (AdminLayout, tiền tố `/admin`, meta `role: nhanvien`)
- `/admin`: TRANG TỔNG QUAN: các thẻ số liệu (chờ duyệt, đang mượn, quá hạn, độc giả bị cấm mượn, sách sắp hết), mỗi thẻ bấm vào
  sang danh sách đã lọc sẵn; bên dưới là bảng "Việc cần làm" gồm tối đa 5 yêu cầu chờ duyệt mới nhất có nút Duyệt và Từ chối.
- `/admin/muonsach`: danh sách phiếu, lọc theo trạng thái, nút Duyệt, Từ chối, Ghi trả, lập phiếu trực tiếp (đã làm).
- `/admin/sach`, `/admin/sach/add`, `/admin/sach/:id`
- `/admin/nhaxuatban`, `/admin/nhaxuatban/add`, `/admin/nhaxuatban/:id`
- `/admin/docgia`: danh sách CHỈ ĐỌC (xem, tìm, lọc người bị cấm), nút xóa dấu xấu; nút xóa độc giả chỉ hiện với QuanLy.
  KHÔNG có trang thêm và sửa độc giả.
- `/admin/nhanvien`, `/admin/nhanvien/add`, `/admin/nhanvien/:id`: chỉ QuanLy. Menu "Nhân viên" chỉ hiện với QuanLy.
  Giao diện ẩn nút nhưng backend mới là lớp bảo vệ thật.
- `/admin/ho-so`: sửa thông tin của mình (gồm email) và đổi mật khẩu.
- Menu: Tổng quan, Mượn trả, Sách, Nhà xuất bản, Độc giả, Nhân viên (chỉ QuanLy), Hồ sơ, Đăng xuất.

### 7.5 Guard và phiên làm việc
Route guard (kiểu `return`): trang cần đăng nhập mà chưa có session thì chuyển `/login`. Sai vai trò thì chuyển về trang chủ của
vai trò đó. Đã đăng nhập mà vào `/login`, `/dang-ky` thì chuyển về trang chủ vai trò. Trang `/quen-mat-khau`,
`/dat-lai-mat-khau`, `/` luôn vào được khi chưa đăng nhập (riêng `/` đẩy nhân viên về `/admin`).
Session lưu ở localStorage gồm token và user kèm `role`. Axios có interceptor gắn token và khi gặp 401 thì xóa session, chuyển `/login`.
Giao diện chỉ ẩn/hiện cho thân thiện. Lớp bảo vệ thật nằm ở backend.

## 8. Thứ tự thực hiện (mỗi bước chạy được, test, commit rồi mới sang bước sau)

| Bước | Nội dung | Trạng thái |
|---|---|---|
| 0 đến 4 | Backend: index, sách, độc giả, nhân viên, xác thực, mượn/trả | Xong |
| 5A, 5B | Frontend: PrimeVue, đăng nhập, guard, hai layout, mẫu NhaXuatBan | Xong |
| 6A, 6B, 6C | Frontend nhân viên: sách, độc giả và nhân viên (bản cũ), mượn/trả | Xong 6A, 6B. 6C đã làm, chờ test |
| 3C-1 | Backend: migrate, ChucVu QuanLy/NhanVien, Email, requireQuanLy, đổi quyền các route (độc giả chỉ đọc, GET sách và NXB công khai), bỏ POST và PUT thường của độc giả | Chưa |
| 3C-2 | Backend: đăng ký độc giả (mã tự sinh), hồ sơ cá nhân | Chưa |
| 3C-3 | Backend: quên mật khẩu qua email (nodemailer), đặt lại mật khẩu | Chưa |
| 3C-4 | Backend: thống kê tổng quan, bộ lọc `cam`, `saphet` | Chưa |
| 5C | Frontend: đăng nhập hai thẻ, đăng ký, quên và đặt lại mật khẩu | Chưa |
| 6D | Frontend nhân viên: tổng quan, menu theo ChucVu, độc giả chỉ đọc, nhân viên chỉ QuanLy, hồ sơ | Chưa |
| 7 | Frontend độc giả: danh mục sách làm trang chủ, lịch sử mượn, hồ sơ | Chưa |
| 8 | Nhóm C chọn lọc nếu còn thời gian, kiểm thử toàn bộ, chụp ảnh báo cáo | Chưa |

Dữ liệu cũ cần chuyển đổi bằng `backend/scripts/migrate-v2.js <MSNV_QuanLy>`: đặt ChucVu hợp lệ cho nhân viên hiện có
(người được chỉ định thành QuanLy, những người khác thành NhanVien), tạo bộ đếm `counters` theo mã độc giả lớn nhất, tạo các index mới.

## 9. Kịch bản kiểm thử bắt buộc (dùng làm ảnh trong báo cáo)

Mượn/trả:
1. Độc giả gửi yêu cầu, nhân viên duyệt: SoQuyenCon giảm 1.
2. Nhân viên từ chối: SoQuyenCon không đổi.
3. Sách hết (SoQuyenCon = 0): yêu cầu bị 409.
4. Ghi trả đúng hạn, sách bình thường: không có dấu xấu.
5. Ghi trả trễ hạn: SoLanViPham tăng 1, ViPham = QuaHan.
6. Ghi trả sách hỏng: SoLanViPham tăng 1, ViPham = HuHong.
7. Đủ 3 dấu: độc giả gửi yêu cầu bị 403.
8. Nhân viên xóa dấu xấu: độc giả mượn lại được.

Phân quyền:
9. Độc giả gọi API quản lý: 403. Không token: 401.
10. Độc giả xem phiếu của người khác: không thấy.
11. NhanVien gọi API nhân viên: 403. NhanVien xóa độc giả: 403.
12. QuanLy không tự xóa mình, không tự hạ cấp mình. Xóa hoặc hạ cấp QuanLy cuối cùng: 409.
13. Quản lý bị hạ cấp: lần gọi kế tiếp bị 403 dù token còn hạn.

Tài khoản:
14. Khách xem được danh mục sách (GET /sach không token). Khách bấm Mượn: bị chuyển `/login`.
15. Đăng ký độc giả: mã tự sinh đúng dạng, gửi kèm MaDocGia hoặc SoLanViPham giả thì bị bỏ qua. Email trùng: 409.
16. Đăng ký hai người cùng lúc: hai mã khác nhau.
17. Quên mật khẩu: email lạ và email thật đều nhận cùng một thông báo. Có email: nhận mã tài khoản và liên kết.
18. Dùng liên kết đặt lại: đổi được mật khẩu. Dùng lần hai: 400. Liên kết hết hạn: 400. Mật khẩu cũ không còn đăng nhập được.
19. Yêu cầu quên mật khẩu hai lần trong 60 giây: chỉ một email.
20. Độc giả sửa hồ sơ: gửi kèm MaDocGia hoặc SoLanViPham thì bị bỏ qua.
