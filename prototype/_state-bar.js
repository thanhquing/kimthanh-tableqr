/* Hang nut chuyen 4 trang thai man hinh — CHI co o prototype.
   Ban React khong co cai nay; 4 trang thai o do do TanStack Query quyet dinh. */
function stateBar(onChange, initial = 'ok') {
  const STATES = [['ok', 'Có dữ liệu'], ['loading', 'Loading'], ['empty', 'Rỗng'], ['error', 'Lỗi']]
  const bar = document.createElement('div')
  bar.className = 'protobar'
  bar.style.background = '#292524'
  bar.innerHTML = '<b>TRẠNG THÁI</b>' + STATES.map(([k, t]) =>
    `<button data-st="${k}" class="${k === initial ? 'on' : ''}">${t}</button>`).join('')
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-st]')
    if (!b) return
    bar.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b))
    onChange(b.dataset.st)
  })
  /* dat ngay duoi protobar dieu huong */
  const nav = document.querySelector('.protobar')
  if (nav) nav.after(bar); else document.body.prepend(bar)
}
