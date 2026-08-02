/* ⚠️  MÃ QR MINH HOẠ — KHÔNG QUÉT ĐƯỢC.
 *
 *  Ham nay ve mot hinh TRONG GIONG ma QR (co 3 o dinh vi + luoi module sinh
 *  theo token) chi de danh gia BO CUC va BAN IN. No KHONG ma hoa du lieu that:
 *  chua co Reed-Solomon, chua co version/mask hop le.
 *
 *  Ma QR that duoc sinh bang `qrcode.react` o task AD-06. Tuyet doi khong in
 *  ban prototype nay ra dan len ban.
 */
function fakeQr(token, px = 160) {
  const N = 25 // so module moi canh
  let h = 2166136261
  for (const ch of token) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) }
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296 }

  const on = (r, c) => {
    // 3 o dinh vi o 3 goc
    for (const [br, bc] of [[0, 0], [0, N - 7], [N - 7, 0]]) {
      const dr = r - br, dc = c - bc
      if (dr >= 0 && dr < 7 && dc >= 0 && dc < 7) {
        const ring = Math.max(Math.abs(dr - 3), Math.abs(dc - 3))
        return ring === 3 || ring <= 1
      }
      if (dr >= -1 && dr < 8 && dc >= -1 && dc < 8) return false // vien trang
    }
    if (r === 6 || c === 6) return (r + c) % 2 === 0 // timing
    return rnd() > 0.5
  }

  const cell = px / N
  let rects = ''
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (on(r, c))
        rects += `<rect x="${(c * cell).toFixed(2)}" y="${(r * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}"/>`

  return `<svg width="${px}" height="${px}" viewBox="0 0 ${px} ${px}" role="img"
     aria-label="Mã QR minh hoạ cho ${token}"><rect width="${px}" height="${px}" fill="#fff"/>
     <g fill="#1C1917">${rects}</g></svg>`
}
