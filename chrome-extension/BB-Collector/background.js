// extension/background.js

const API_URL = "http://127.0.0.1:3690/api/knowledge/add";

// 1. 创建菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-to-bright-brain",
    title: "收藏到 Bright-Brain 知识库",
    contexts: ["page", "selection"]
  });
});

// 2. 监听点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "save-to-bright-brain") {
    
    // ⚠️ 排除 chrome:// 开头的系统页面，防止报错
    if (tab.url.startsWith("chrome://")) {
      console.warn("无法在系统页面使用此功能");
      return;
    }

    try {
      // 注入成功后，稍微等一下再发消息（保险起见）
      // 然后向 Tab 发送消息
      chrome.tabs.sendMessage(tab.id, { action: "getPageContent" }, (response) => {
        if (response) {
          console.log("获取到内容，准备发送后端...");
          sendToBackend(response);
        }
      });

    } catch (err) {
      console.error("注入脚本失败:", err);
    }
  }
});

// 3. 发送给后端 (保持不变)
async function sendToBackend(data) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: data.url,
        title: data.title,
        content: data.content
      })
    });
    if (res.ok) console.log("收藏成功!");
    else console.error("后端报错:", await res.text());
  } catch (error) {
    console.error("无法连接桌面端:", error);
  }
}