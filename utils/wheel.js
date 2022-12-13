export const wheel = {
  inserted(el, binding) {
    // let timer = null
    const { value } = binding;
    let disabled = false
    el.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) > 1) {
        // clearTimeout(timer)
        // timer = setTimeout(() => {
        //   const isNext = e.deltaX > 0
        //   value(isNext)
        // }, 100)
        disabled = el.getAttribute('wheel-disabled')
        if (disabled === '1') return;
        el.setAttribute('wheel-disabled', '1')
        const isNext = e.deltaX > 0
        value(isNext)
      }
    })
  }
}

export default wheel
