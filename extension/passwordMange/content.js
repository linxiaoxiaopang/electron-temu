// 页面加载完成后执行（由manifest的run_at保证时机）
let dom = {
  usernameId: null,
  passwordId: null
}

let dic = []


getDom()

function getDom() {
  dom.usernameId = document.querySelector('#usernameId')
  dom.passwordId = document.querySelector('#passwordId')
  if (!dom.usernameId || !dom.passwordId) {
    setTimeout(() => {
      getDom()
    }, 1000)
  } else {
    getDic()
    dom.usernameId.addEventListener('focus', function () {
      const container = crateSelectInput(this.getBoundingClientRect())
      this.addEventListener('blur', function () {
        setTimeout(() => {
          container.parentNode.removeChild(container)
        }, 300)
      }, { once: true })
    })

    dom.passwordId.addEventListener('focus', function () {
      const container = crateSelectInput(this.getBoundingClientRect())
      this.addEventListener('blur', function () {
        setTimeout(() => {
          container.parentNode.removeChild(container)
        }, 300)
      }, { once: true })
    })
  }
}

function crateSelectInput(pos) {
  const container = document.createElement('div')
  Object.assign(container.style, {
    background: '#fff',
    position: 'fixed',
    top: pos.bottom + 'px',
    left: pos.left + 100 + 'px',
    boxShadow: '5px 5px 10px 2px rgba(0, 0, 0, 0.1)'
  })

  container.innerHTML = `
    <div class="dropdown" style="padding: 10px;">
      ${dic.map(item => (`<div class="dropdown-item" data-id="${item.id}">${item.usernameId}</div>`)).join('\n')}
    <div>
  `
  document.body.appendChild(container)
  const dropdownItems = [...document.querySelectorAll('.dropdown-item')]
  dropdownItems.map(dropdownItem => {
    Object.assign(dropdownItem.style, {
      background: '#fff',
      padding: '5px',
      textAlign: 'left',
      whiteSpace: 'nowrap',
      cursor: 'pointer'
    })
    dropdownItem.addEventListener('click', function () {
      const id = this.getAttribute('data-id')
      const fItem = dic.find(item => item.id == id)
      if (!fItem) return
      simulateInput(dom.usernameId, fItem.usernameId)
      simulateInput(dom.passwordId, fItem.passwordId)
    }, { once: true })
  })

  return container
}

function simulateInput(input, value) {
  // 1. 修改输入框的值（必须先改值，否则事件中获取的是旧值）
  input.value = value

  // 2. 创建 input 事件（允许冒泡，确保所有监听者能捕获）
  const inputEvent = new Event('input', {
    bubbles: true,    // 事件冒泡（关键：父元素或全局监听需要）
    cancelable: true  // 允许取消默认行为（可选）
  })

  // 3. 触发事件
  input.dispatchEvent(inputEvent)
}

async function getDic() {
  const response = await fetch('http://localhost:3000/temu-agentseller/api/user/userAuth/list', {
    method: 'POST',
    body: JSON.stringify({})
  })
  const json = await response.json()
  return dic = json?.data || []
}
