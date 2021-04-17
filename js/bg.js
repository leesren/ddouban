function log(...args) {
  console.log(args);
}
const defaultLs = [
  { userName: '李广', userAccount: 'liguang', userId: 'UR1000006965' },
  { userName: '梁莹', userAccount: 'liangying', userId: 'UR1000007038' },
  { userName: '王玲玲', userAccount: 'wangll2', userId: 'UR1000007074' },
  { userName: '谢继军', userAccount: 'xiejj', userId: 'UR1000006910' },
  { userName: '孙卫金', userAccount: 'sunwj', userId: 'UR1000007066' },
  { userName: '仲雅琦', userAccount: 'zhongyq', userId: 'UR1000070992' },
  { userName: '汪纯冰', userAccount: 'zjb_wangcb', userId: 'UR1000007335' },
  { userName: '李洁', userAccount: 'lij', userId: 'UR1000072510' },
  { userName: '武子浩', userAccount: 'wuzihao', userId: 'UR1000072514' },
  { userName: '于明礼', userAccount: 'yuml', userId: 'UR1000006947' },
  { userName: '邓永辉', userAccount: 'dengyh', userId: 'UR1000070989' },
  { userName: '王黎祥', userAccount: 'wanglx', userId: 'UR1000006918' },
  { userName: '霍达', userAccount: 'huoda', userId: 'UR1000069978' },
  { userName: '左飞', userAccount: 'zuofei', userId: 'UR1000007131' },
  { userName: '孟祥友', userAccount: 'mengxy1', userId: 'UR1000006631' },
  { userName: '刘畅16', userAccount: 'liuchang16', userId: 'UR1000070708' }
];
var storeService = {
  defaultLs: defaultLs,
  ipUrl: '',
  allUsers: [],
  updateIpUrl: function (ip) {
    if (ip && /^http[s]:\/\//.test(ip)) {
      this.ipUrl = ip;
      chrome.storage.local.set({ ipUrl: ip }, function () {});
    }
  },
  storeList: function () {
    chrome.storage.local.set(
      { ibp_user: JSON.stringify(this.defaultLs) },
      function () {}
    );
  },
  getStoreUser: function () {
    return this.defaultLs.slice(0);
  },
  removeStoreUser: function (index) {
    this.defaultLs.splice(index, 1);
    this.storeList();
  },
  removeAllStoreUser: function () {
    this.defaultLs.length = 0;
    this.storeList();
  },
  isContainUser: function (item) {
    return this.defaultLs.some((el) => el.userAccount == item.userAccount);
  },
  addStoreUser: function (item) {
    this.defaultLs.push(item);
    this.storeList();
  },
  checkUser: function (item) {
    return fetch(
      `${this.ipUrl}/devops/verify/quicklogin/login.php?userId=${item.userId}&userAccount=${item.userAccount}&userName=${item.userName}`,
      { body: null, method: 'POST' }
    ).then((res) => res.json());
  },
  getAllUserByRequest: function () {
    return fetch(`${this.ipUrl}/devops/verify/quicklogin/orgTree.php?1=1`, {})
      .then((res) => res.json())
      .then((res) => {
        this.updateAllUser(res);
      });
  },
  updateAllUser(items = []) {
    if (items.length == 0) return;
    const foo = function (item) {
      var list = [];
      const getItem = (ls) => {
        ls.map((el) => {
          if (el.children.length == 0) {
            list.push(el);
          } else {
            getItem(el.children);
          }
        });
      };
      if (item.length > 0) {
        getItem(item);
      } else {
        item.children && getItem(item.children);
      }
      return list;
    };
    const newList = foo(items);
    this.allUsers = newList.map((el) => {
      return {
        userAccount: el.account,
        userName: el.text,
        userId: el.id
      };
    });
    console.log('newList length', newList.length);
  }
};
chrome.storage.local.get({ ibp_user: [], ipUrl: '', allUsers: [] }, function (
  data
) {
  const ibp_user =
    typeof data.ibp_user == 'string'
      ? JSON.parse(data.ibp_user)
      : data.ibp_user;
  const allUsers =
    typeof data.allUsers == 'string'
      ? JSON.parse(data.allUsers)
      : data.allUsers;
  const ipUrl = data.ipUrl || 'http://172.253.32.91';
  storeService.ipUrl = ipUrl;
  ibp_user.map((el) => {
    if (!storeService.isContainUser(el)) {
      storeService.defaultLs.push(el);
    }
  });
  if (allUsers.length > 0) {
    storeService.allUsers = allUsers;
  } else {
    storeService.getAllUserByRequest();
  }

  // chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  // chrome.tabs.sendMessage(tabs[0].id, {
  //   type: 'init_dom',
  //   data: {
  //     time: Date.now()
  //   }
  // }, function (response) {

  // });

  // chrome.tabs.sendRequest(tabs[0].id, { msg: "finished" }, function (response) {
  //   console.log('sendRequest : bg -> content ', response);
  // });
  // });
});
// bg get msg from content_scripts

// 从 bg --- msg ---> content_scripts

chrome.runtime.onMessage.addListener(function (e, sender) {
  const { message, data } = e;
  const tabId = sender.tab.id;
  const handler = EventSet.get(message);
  handler && handler(data, tabId);
});

function send(message, data, tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendRequest(tabId, { message, data }, function (response) {});
  });
}
var EventSet = new Map()
  .set('GetCurrentProcessor', ({ quick, userName }, tabId) => {
    if (storeService.allUsers.length == 0) {
      storeService.getAllUserByRequest();
      return send(
        'GetCurrentProcessor_Error',
        '获取用户列表失败，请查看筋斗云',
        tabId
      );
    }
    const item = storeService.allUsers.find((el) => el.userName == userName);
    if (item) {
      storeService
        .checkUser(item)
        .then((res) => {
          send('GetCurrentProcessor_OK', { quick, data: res }, tabId);
        })
        .catch((error) => {
          send('GetCurrentProcessor_Error', '获取token失败', tabId);
        });
    } else {
      send('GetCurrentProcessor_Error', `${userName}用户找不到`, tabId);
    }
  })
  .set('SetAllUsers', (data, tabId) => {
    storeService.updateAllUser(data);
  })
  .set('GetUsers', (data, tabId) => {
    log('GetUsers', data, tabId);
    send('GetUsers', storeService.defaultLs, tabId);
  })
  .set('Change_User', (data, tabId) => {
    storeService
      .checkUser(data)
      .then((res) => {
        log(res);
        send('Change_User_Ok', res, tabId);
      })
      .catch((error) => {
        send('Change_User_Error', error.message, tabId);
      });
  });
