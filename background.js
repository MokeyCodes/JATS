// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log("J.A.T.S. background service worker is active.");
});

// (Optional: keep ready for future updates)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PING") {
    sendResponse({ status: "Background alive" });
  }
});
