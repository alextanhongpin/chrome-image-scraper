chrome.runtime.onInstalled.addListener(() => {
  console.log("installed");
});

chrome.runtime.onMessage.addListener((data) => {
  if (data.type === "notification") {
    //chrome.notifications.create("", data.options);
  }
});
