function start() {
  var page = chrome.extension.getBackgroundPage();
  document.querySelector('.todo-list').addEventListener('click', (e) => {
    console.log(e.target);
    if (e.target.nodeName == 'SPAN' && e.target.classList.contains('delete')) {
      const index = +e.target.dataset.index;
      page.storeService.removeStoreUser(index);
      updateList();
    }
  });
  document.querySelector('.clear-all').addEventListener('click', (e) => {
    page.storeService.removeAllStoreUser();
    updateList();
  });
  const state = {
    isAdding: false
  };
  document.querySelector('.btn-update').addEventListener('click', (e) => {
    const ip = document.getElementById('ipSetting').value;
    page.storeService.updateIpUrl(ip);
  });
  document.getElementById('ipSetting').value = page.storeService.ipUrl;

  document.querySelector('.btn-add').addEventListener('click', (e) => {
    if (state.isAdding) return;
    state.isAdding = true;
    const userUrlDom = document.getElementById('userUrl');
    const userUrl = decodeURIComponent(userUrlDom.value + '');
    if (!userUrl.match('/devops/verify/quicklogin/login.php?')) {
      state.isAdding = false;
      return (document.querySelector('.notice').innerHTML = '请填写正确URL');
    }
    const [userId, userAccount, userName] = userUrl
      .split('?')
      .pop()
      .split('&')
      .map((el) => el.split('=').pop());
    if (!userAccount || !userName || !userId) {
      document.querySelector('.notice').innerHTML =
        '请填写正确的账号的和姓名&userId';
      state.isAdding = false;
      return;
    }
    const add = (item) => {
      page.storeService.addStoreUser(item);
      updateList();
      userUrlDom.value = '';
    };
    const item = { userAccount, userName, userId };
    if (page.storeService.isContainUser(item)) {
      state.isAdding = false;
      document.querySelector('.notice').innerHTML = '用户已经存在';
      return;
    }
    page.storeService
      .checkUser(item)
      .then((res) => {
        add(item);
      })
      .catch((error) => {})
      .finally(() => {
        state.isAdding = false;
      });
  });
  const updateList = () => {
    const users = page.storeService.getStoreUser() || [];
    console.log('users===>', users);
    const buildList = (item, index) => {
      return `
            <li data-value="${index}">
                <label for="item_1"></label>
                <span class="todo-text">${index + 1} ${item.userName}<i>${
        item.userAccount
      }</i> </span>
                <span class="delete" data-index="${index}"></span>
            </li>
          `;
    };
    const html = users.map(buildList).join('');
    document.querySelector('.todo-list').innerHTML = html;
    document.querySelector('.busy').innerHTML = `You have ${
      users.length
    } pending item<span>${users.length > 1 ? 's' : ''}</span>`;
  };
  updateList();
  document
    .querySelector('.segmented-control')
    .addEventListener('click', (e) => {
      if (
        e.target.nodeName == 'A' &&
        e.target.classList.contains('control-item')
      ) {
        const controls = document.querySelectorAll('.control-item');
        [...controls].map((el) => {
          el.classList.remove('active');
        });
        e.target.classList.add('active');
        const value = e.target.dataset.value;
        const items = document.querySelectorAll('.control-target-item');
        [...items].map((el) => {
          if (el.dataset.value === value) {
            el.classList.remove('none');
            el.classList.add('active');
          } else {
            el.classList.add('none');
          }
        });
      }
    });
}
window.onload = start;
