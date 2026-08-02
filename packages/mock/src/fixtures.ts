/** Du lieu mau. Nguon anh + giay phep: packages/mock/assets/CREDITS.md
 *
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │  URL DE DEV MO NHANH:  /t/qr-ban-01-a7f3k9m2xp                    │
 *  └──────────────────────────────────────────────────────────────────┘
 *
 *  qrToken hard-code (khong random) de bookmark duoc giua cac lan chay.
 *
 *  Thuc don co chu y cai ca bien de ep bo cuc lo loi:
 *    - Ten dai tran 2 dong        -> "Lau thai hai san dac biet cho 4 nguoi"
 *    - Gia 6 chu so               -> 350.000 d (kiem cot gia thang hang)
 *    - Gia thap 4 chu so          -> tra da 8.000 d
 *    - Mo ta rat dai              -> com tam suon bi cha
 *    - 2 mon het hang             -> banh xeo, che ba mau
 *    - Mon khong co anh           -> tra tac (kiem o placeholder chu cai dau)
 */

import type {
  DiningTable,
  MenuCategory,
  MenuItem,
  Restaurant,
} from '@kimthanh-tableqr/contracts'

/** Duong dan anh — app copy thu muc assets vao public/ hoac import qua bundler. */
const img = (slug: string) => `/menu-images/${slug}.jpg`

export const RESTAURANT: Restaurant = {
  id: 'res-kim-thanh',
  name: 'Quán Cơm Kim Thành',
  logoUrl: null,
  address: '128 Nguyễn Thái Học, Quận 1, TP.HCM',
}

export const CATEGORIES: MenuCategory[] = [
  { id: 'cat-do-uong', name: 'Đồ uống', sortOrder: 1, isActive: true },
  { id: 'cat-khai-vi', name: 'Khai vị', sortOrder: 2, isActive: true },
  { id: 'cat-mon-chinh', name: 'Món chính', sortOrder: 3, isActive: true },
  { id: 'cat-trang-mieng', name: 'Tráng miệng', sortOrder: 4, isActive: true },
]

export const MENU_ITEMS: MenuItem[] = [
  /* ---------------------------------------------------------- Đồ uống */
  {
    id: 'item-ca-phe-sua-da',
    categoryId: 'cat-do-uong',
    name: 'Cà phê sữa đá',
    description: 'Cà phê phin truyền thống, sữa đặc, đá viên',
    priceVnd: 25000,
    imageUrl: img('ca-phe-sua-da'),
    isAvailable: true,
    sortOrder: 1,
  },
  {
    id: 'item-ca-phe-den-da',
    categoryId: 'cat-do-uong',
    name: 'Cà phê đen đá',
    description: 'Đậm, không sữa',
    priceVnd: 20000,
    imageUrl: img('ca-phe-den-da'),
    isAvailable: true,
    sortOrder: 2,
  },
  {
    id: 'item-tra-da',
    categoryId: 'cat-do-uong',
    // gia 4 chu so — kiem cot gia van thang hang voi mon 6 chu so
    name: 'Trà đá',
    description: 'Trà xanh pha loãng, đá viên',
    priceVnd: 8000,
    imageUrl: img('tra-da'),
    isAvailable: true,
    sortOrder: 3,
  },
  {
    id: 'item-nuoc-mia',
    categoryId: 'cat-do-uong',
    name: 'Nước mía',
    description: 'Ép tại chỗ, thêm tắc',
    priceVnd: 15000,
    imageUrl: img('nuoc-mia'),
    isAvailable: true,
    sortOrder: 4,
  },
  {
    id: 'item-sinh-to-bo',
    categoryId: 'cat-do-uong',
    name: 'Sinh tố bơ',
    description: 'Bơ sáp Đắk Lắk, sữa đặc',
    priceVnd: 35000,
    imageUrl: img('sinh-to-bo'),
    isAvailable: true,
    sortOrder: 5,
  },
  {
    id: 'item-tra-tac',
    categoryId: 'cat-do-uong',
    // KHONG CO ANH — de kiem o placeholder chu cai dau (ai-docs/08 §5)
    name: 'Trà tắc',
    description: 'Trà tươi, tắc vắt, mật ong',
    priceVnd: 18000,
    imageUrl: null,
    isAvailable: true,
    sortOrder: 6,
  },

  /* --------------------------------------------------------- Khai vị */
  {
    id: 'item-goi-cuon',
    categoryId: 'cat-khai-vi',
    name: 'Gỏi cuốn tôm thịt',
    description: 'Hai cuốn, chấm tương đậu phộng',
    priceVnd: 35000,
    imageUrl: img('goi-cuon'),
    isAvailable: true,
    sortOrder: 1,
  },
  {
    id: 'item-cha-gio',
    categoryId: 'cat-khai-vi',
    name: 'Chả giò',
    description: 'Bốn cuốn, chiên giòn, nước mắm chua ngọt',
    priceVnd: 40000,
    imageUrl: img('cha-gio'),
    isAvailable: true,
    sortOrder: 2,
  },
  {
    id: 'item-banh-xeo',
    categoryId: 'cat-khai-vi',
    // HET HANG — kiem anh xam + nhan "Het mon" + khong bam duoc
    name: 'Bánh xèo',
    description: 'Vỏ giòn nghệ, tôm thịt, giá đỗ, rau sống',
    priceVnd: 45000,
    imageUrl: img('banh-xeo'),
    isAvailable: false,
    sortOrder: 3,
  },
  {
    id: 'item-nem-nuong',
    categoryId: 'cat-khai-vi',
    name: 'Nem nướng cuốn bánh tráng',
    description: 'Nem nướng than hoa, bánh tráng, rau thơm, tương chấm',
    priceVnd: 50000,
    imageUrl: img('nem-nuong'),
    isAvailable: true,
    sortOrder: 4,
  },
  {
    id: 'item-goi-du-du',
    categoryId: 'cat-khai-vi',
    name: 'Gỏi đu đủ tôm khô',
    description: 'Chua cay, đậu phộng rang',
    priceVnd: 35000,
    imageUrl: img('goi-du-du'),
    isAvailable: true,
    sortOrder: 5,
  },

  /* ------------------------------------------------------- Món chính */
  {
    id: 'item-pho-bo',
    categoryId: 'cat-mon-chinh',
    name: 'Phở bò tái nạm',
    description: 'Nước dùng ninh xương 12 tiếng',
    priceVnd: 55000,
    imageUrl: img('pho-bo'),
    isAvailable: true,
    sortOrder: 1,
  },
  {
    id: 'item-bun-bo-hue',
    categoryId: 'cat-mon-chinh',
    name: 'Bún bò Huế',
    description: 'Cay vừa, giò heo, chả cua',
    priceVnd: 60000,
    imageUrl: img('bun-bo-hue'),
    isAvailable: true,
    sortOrder: 2,
  },
  {
    id: 'item-com-tam-suon',
    categoryId: 'cat-mon-chinh',
    // MO TA RAT DAI — kiem cat chu bang … o card, hien day du o sheet
    name: 'Cơm tấm sườn bì chả',
    description:
      'Cơm tấm hạt nhỏ nấu bằng nồi gang, sườn cốt lết ướp sả tỏi nướng than hoa, bì heo trộn thính, chả trứng hấp, ăn kèm đồ chua, mỡ hành và chén nước mắm pha theo công thức riêng của quán',
    priceVnd: 65000,
    imageUrl: img('com-tam-suon'),
    isAvailable: true,
    sortOrder: 3,
  },
  {
    id: 'item-bun-cha',
    categoryId: 'cat-mon-chinh',
    name: 'Bún chả Hà Nội',
    description: 'Chả viên và chả miếng nướng than',
    priceVnd: 55000,
    imageUrl: img('bun-cha'),
    isAvailable: true,
    sortOrder: 4,
  },
  {
    id: 'item-mi-quang',
    categoryId: 'cat-mon-chinh',
    name: 'Mì Quảng',
    description: 'Mì nghệ, tôm thịt, bánh đa mè, đậu phộng',
    priceVnd: 50000,
    imageUrl: img('mi-quang'),
    isAvailable: true,
    sortOrder: 5,
  },
  {
    id: 'item-hu-tieu',
    categoryId: 'cat-mon-chinh',
    name: 'Hủ tiếu Nam Vang',
    description: 'Tôm, thịt bằm, gan heo',
    priceVnd: 55000,
    imageUrl: img('hu-tieu'),
    isAvailable: true,
    sortOrder: 6,
  },
  {
    id: 'item-banh-mi-thit',
    categoryId: 'cat-mon-chinh',
    name: 'Bánh mì thịt nướng',
    description: 'Bánh nóng giòn, thịt nướng, pate, rau dưa',
    priceVnd: 30000,
    imageUrl: img('banh-mi-thit'),
    isAvailable: true,
    sortOrder: 7,
  },
  {
    id: 'item-ca-ri-ga',
    categoryId: 'cat-mon-chinh',
    name: 'Cà ri gà',
    description: 'Nước cốt dừa, khoai lang, ăn kèm bánh mì',
    priceVnd: 70000,
    imageUrl: img('ca-ri-ga'),
    isAvailable: true,
    sortOrder: 8,
  },
  {
    id: 'item-lau-thai',
    categoryId: 'cat-mon-chinh',
    // TEN DAI + GIA 6 CHU SO — kiem tran 2 dong va cot gia thang hang
    name: 'Lẩu thái hải sản đặc biệt cho 4 người',
    description: 'Tôm, mực, nghêu, cá phi lê, rau nhúng, bún hoặc mì',
    priceVnd: 350000,
    imageUrl: img('lau-thai-hai-san'),
    isAvailable: true,
    sortOrder: 9,
  },

  /* ----------------------------------------------------- Tráng miệng */
  {
    id: 'item-che-ba-mau',
    categoryId: 'cat-trang-mieng',
    // HET HANG thu hai
    name: 'Chè ba màu',
    description: 'Đậu đỏ, đậu xanh, thạch, nước cốt dừa',
    priceVnd: 25000,
    imageUrl: img('che-ba-mau'),
    isAvailable: false,
    sortOrder: 1,
  },
  {
    id: 'item-banh-flan',
    categoryId: 'cat-trang-mieng',
    name: 'Bánh flan',
    description: 'Caramel đắng nhẹ, làm trong ngày',
    priceVnd: 20000,
    imageUrl: img('banh-flan'),
    isAvailable: true,
    sortOrder: 2,
  },
]

/** qrToken hard-code de dev bookmark duoc. Ban 01 la ban hay dung khi test. */
export const TABLES: DiningTable[] = [
  { id: 'tbl-01', code: 'B01', displayName: 'Bàn 1', qrToken: 'qr-ban-01-a7f3k9m2xp', status: 'EMPTY', isActive: true, sortOrder: 1 },
  { id: 'tbl-02', code: 'B02', displayName: 'Bàn 2', qrToken: 'qr-ban-02-b8g4l0n3yq', status: 'EMPTY', isActive: true, sortOrder: 2 },
  { id: 'tbl-03', code: 'B03', displayName: 'Bàn 3', qrToken: 'qr-ban-03-c9h5m1o4zr', status: 'EMPTY', isActive: true, sortOrder: 3 },
  { id: 'tbl-04', code: 'B04', displayName: 'Bàn 4', qrToken: 'qr-ban-04-d0i6n2p5as', status: 'EMPTY', isActive: true, sortOrder: 4 },
  { id: 'tbl-05', code: 'B05', displayName: 'Bàn 5', qrToken: 'qr-ban-05-e1j7o3q6bt', status: 'EMPTY', isActive: true, sortOrder: 5 },
  { id: 'tbl-06', code: 'B06', displayName: 'Bàn 6', qrToken: 'qr-ban-06-f2k8p4r7cu', status: 'EMPTY', isActive: true, sortOrder: 6 },
  { id: 'tbl-07', code: 'B07', displayName: 'Bàn 7', qrToken: 'qr-ban-07-g3l9q5s8dv', status: 'EMPTY', isActive: true, sortOrder: 7 },
  { id: 'tbl-08', code: 'B08', displayName: 'Bàn 8', qrToken: 'qr-ban-08-h4m0r6t9ew', status: 'EMPTY', isActive: true, sortOrder: 8 },
]

/** Ban 3 co san mot phien dang mo voi 2 lan goi mon, de man hinh bep va man
 *  /orders co du lieu ngay tu lan chay dau tien (khong phai empty state). */
export const SEEDED_SESSION = {
  sessionId: 'ses-seed-01',
  tableId: 'tbl-03',
  orders: [
    {
      sequenceNo: 1,
      status: 'SERVED' as const,
      minutesAgo: 24,
      items: [
        { menuItemId: 'item-ca-phe-sua-da', quantity: 2, note: 'ít đá' },
        { menuItemId: 'item-goi-cuon', quantity: 1, note: null },
      ],
    },
    {
      sequenceNo: 2,
      status: 'NEW' as const,
      minutesAgo: 3,
      items: [
        { menuItemId: 'item-com-tam-suon', quantity: 1, note: 'không mỡ hành' },
        { menuItemId: 'item-tra-da', quantity: 2, note: null },
      ],
    },
  ],
}

export const STAFF_PIN = '246810'
export const ADMIN_EMAIL = 'chuquan@kimthanh.vn'
export const ADMIN_PASSWORD = 'kimthanh2026'
