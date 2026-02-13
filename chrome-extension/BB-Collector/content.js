// extension/content.js

// 监听来自后台的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    sendResponse({
      url: window.location.href,
      title: document.title,
      content: document.documentElement.outerHTML
    });
  }
});