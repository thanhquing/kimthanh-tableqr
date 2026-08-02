/* Du lieu + helper dung chung cho prototype.
   Trich tu packages/mock/src/fixtures.ts — giu dong bo khi doi fixture.
   Logic tinh tien/format o day PHAI khop packages/contracts/src/{totals,format}.ts */

const CATS = [
  { id: 'cat-do-uong', name: 'Đồ uống' },
  { id: 'cat-khai-vi', name: 'Khai vị' },
  { id: 'cat-mon-chinh', name: 'Món chính' },
  { id: 'cat-trang-mieng', name: 'Tráng miệng' },
]

const IT = [
  ['item-ca-phe-sua-da','cat-do-uong','Cà phê sữa đá','Cà phê phin truyền thống, sữa đặc, đá viên',25000,'ca-phe-sua-da',1],
  ['item-ca-phe-den-da','cat-do-uong','Cà phê đen đá','Đậm, không sữa',20000,'ca-phe-den-da',1],
  ['item-tra-da','cat-do-uong','Trà đá','Trà xanh pha loãng, đá viên',8000,'tra-da',1],
  ['item-nuoc-mia','cat-do-uong','Nước mía','Ép tại chỗ, thêm tắc',15000,'nuoc-mia',1],
  ['item-sinh-to-bo','cat-do-uong','Sinh tố bơ','Bơ sáp Đắk Lắk, sữa đặc',35000,'sinh-to-bo',1],
  ['item-tra-tac','cat-do-uong','Trà tắc','Trà tươi, tắc vắt, mật ong',18000,null,1],
  ['item-goi-cuon','cat-khai-vi','Gỏi cuốn tôm thịt','Hai cuốn, chấm tương đậu phộng',35000,'goi-cuon',1],
  ['item-cha-gio','cat-khai-vi','Chả giò','Bốn cuốn, chiên giòn, nước mắm chua ngọt',40000,'cha-gio',1],
  ['item-banh-xeo','cat-khai-vi','Bánh xèo','Vỏ giòn nghệ, tôm thịt, giá đỗ, rau sống',45000,'banh-xeo',0],
  ['item-nem-nuong','cat-khai-vi','Nem nướng cuốn bánh tráng','Nem nướng than hoa, bánh tráng, rau thơm, tương chấm',50000,'nem-nuong',1],
  ['item-goi-du-du','cat-khai-vi','Gỏi đu đủ tôm khô','Chua cay, đậu phộng rang',35000,'goi-du-du',1],
  ['item-pho-bo','cat-mon-chinh','Phở bò tái nạm','Nước dùng ninh xương 12 tiếng',55000,'pho-bo',1],
  ['item-bun-bo-hue','cat-mon-chinh','Bún bò Huế','Cay vừa, giò heo, chả cua',60000,'bun-bo-hue',1],
  ['item-com-tam-suon','cat-mon-chinh','Cơm tấm sườn bì chả','Cơm tấm hạt nhỏ nấu bằng nồi gang, sườn cốt lết ướp sả tỏi nướng than hoa, bì heo trộn thính, chả trứng hấp, ăn kèm đồ chua, mỡ hành và chén nước mắm pha theo công thức riêng của quán',65000,'com-tam-suon',1],
  ['item-bun-cha','cat-mon-chinh','Bún chả Hà Nội','Chả viên và chả miếng nướng than',55000,'bun-cha',1],
  ['item-mi-quang','cat-mon-chinh','Mì Quảng','Mì nghệ, tôm thịt, bánh đa mè, đậu phộng',50000,'mi-quang',1],
  ['item-hu-tieu','cat-mon-chinh','Hủ tiếu Nam Vang','Tôm, thịt bằm, gan heo',55000,'hu-tieu',1],
  ['item-banh-mi-thit','cat-mon-chinh','Bánh mì thịt nướng','Bánh nóng giòn, thịt nướng, pate, rau dưa',30000,'banh-mi-thit',1],
  ['item-ca-ri-ga','cat-mon-chinh','Cà ri gà','Nước cốt dừa, khoai lang, ăn kèm bánh mì',70000,'ca-ri-ga',1],
  ['item-lau-thai','cat-mon-chinh','Lẩu thái hải sản đặc biệt cho 4 người','Tôm, mực, nghêu, cá phi lê, rau nhúng, bún hoặc mì',350000,'lau-thai-hai-san',1],
  ['item-che-ba-mau','cat-trang-mieng','Chè ba màu','Đậu đỏ, đậu xanh, thạch, nước cốt dừa',25000,'che-ba-mau',0],
  ['item-banh-flan','cat-trang-mieng','Bánh flan','Caramel đắng nhẹ, làm trong ngày',20000,'banh-flan',1],
].map(([id, cat, name, desc, price, slug, ok]) => ({ id, cat, name, desc, price, slug, ok: !!ok }))

const byId = (id) => IT.find((i) => i.id === id)

const TABLES = [
  { code: 'B01', name: 'Bàn 1', qr: 'qr-ban-01-a7f3k9m2xp' },
  { code: 'B02', name: 'Bàn 2', qr: 'qr-ban-02-b8g4l0n3yq' },
  { code: 'B03', name: 'Bàn 3', qr: 'qr-ban-03-c9h5m1o4zr' },
  { code: 'B04', name: 'Bàn 4', qr: 'qr-ban-04-d0i6n2p5as' },
  { code: 'B05', name: 'Bàn 5', qr: 'qr-ban-05-e1j7o3q6bt' },
  { code: 'B06', name: 'Bàn 6', qr: 'qr-ban-06-f2k8p4r7cu' },
  { code: 'B07', name: 'Bàn 7', qr: 'qr-ban-07-g3l9q5s8dv' },
  { code: 'B08', name: 'Bàn 8', qr: 'qr-ban-08-h4m0r6t9ew' },
]

/* ---- format: phai khop packages/contracts/src/format.ts ---- */
const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' ₫'
const deTone = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim()
const ST_LABEL = { NEW: 'Đã gửi bếp', PREPARING: 'Đang làm', SERVED: 'Đã phục vụ', CANCELLED: 'Đã huỷ' }
const agoLabel = (m) => (m < 1 ? 'vừa xong' : m < 60 ? m + ' phút trước' : Math.floor(m / 60) + ' giờ trước')
const clockLabel = (m) => {
  const d = new Date(Date.now() - m * 60000)
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

/* ---- gio hang: luu localStorage de bam qua lai giua cac file HTML ---- */
const CART_KEY = 'tableqr-proto-cart'
const getCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || [] } catch { return [] } }
const setCart = (c) => localStorage.setItem(CART_KEY, JSON.stringify(c))
const cartCount = (c) => c.reduce((s, l) => s + l.n, 0)
const cartTotal = (c) => c.reduce((s, l) => s + l.n * byId(l.id).price, 0)
/* Gop: cung mon + cung ghi chu -> cong so luong; khac ghi chu -> tach dong */
function addLine(id, n, note) {
  const c = getCart(), k = (note || '').trim()
  const hit = c.find((l) => l.id === id && (l.note || '') === k)
  if (hit) hit.n += n; else c.push({ id, n, note: k })
  setCart(c); return c
}

/* ---- don da gui trong phien (ban 1) ---- */
const ORDERS = [
  { no: 1, status: 'SERVED', ago: 24, items: [
      { id: 'item-ca-phe-sua-da', n: 2, note: 'ít đá' },
      { id: 'item-goi-cuon', n: 1, note: '' }] },
  { no: 2, status: 'PREPARING', ago: 6, items: [
      { id: 'item-com-tam-suon', n: 1, note: 'không mỡ hành' },
      { id: 'item-tra-da', n: 2, note: '' }] },
]
const orderTotal = (o) => o.items.reduce((s, i) => s + i.n * byId(i.id).price, 0)
/* LOAI don CANCELLED — khop calcSessionTotal() */
const sessionTotal = (os) => os.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + orderTotal(o), 0)

/* ---- toast ---- */
function toast(msg) {
  let t = document.querySelector('.toast')
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t) }
  t.textContent = msg; t.classList.add('on')
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 1800)
}

/* ---- thanh dieu huong prototype (KHONG co o ban React) ---- */
const NAV = [
  ['KHÁCH', [['guest-menu.html', 'Menu'], ['guest-cart.html', 'Giỏ hàng'],
             ['guest-success.html', 'Đã gửi'], ['guest-orders.html', 'Đơn của bàn'],
             ['guest-invalid.html', 'QR lỗi']]],
  ['BẾP', [['staff-login.html', 'Đăng nhập'], ['staff-orders.html', 'Bảng đơn'],
           ['staff-tables.html', 'Sơ đồ bàn'], ['staff-session.html', 'Chi tiết phiên']]],
  ['CHỦ QUÁN', [['admin-menu.html', 'Thực đơn'], ['admin-tables.html', 'Bàn & QR'],
                ['admin-print.html', 'In QR'], ['admin-settings.html', 'Cài đặt']]],
]
function protobar() {
  const here = location.pathname.split('/').pop()
  const html = NAV.map(([grp, links]) =>
    `<b>${grp}</b>` + links.map(([h, t]) =>
      `<a href="${h}" class="${h === here ? 'on' : ''}">${t}</a>`).join('')
  ).join('<span class="sep"></span>')
  document.body.insertAdjacentHTML('afterbegin',
    `<nav class="protobar"><a href="index.html" style="background:#78716C">← Tất cả</a>
     <span class="sep"></span>${html}</nav>`)
}
