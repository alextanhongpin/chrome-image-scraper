// Initialize butotn with users's prefered color
const container = document.getElementById("container");
const scrapeButton = document.getElementById("scrape");
const downloadButton = document.getElementById("download");
const clearButton = document.getElementById("clear");
const output = document.getElementById("output");

renderImages();

const supportedExtensions = [
  ".apng",
  ".avif",
  ".gif",
  ".jpg",
  ".jpeg",
  ".jfif",
  ".pjpeg",
  ".pjp",
  ".png",
  ".svg",
  ".webp",
  ".bmp",
  ".ico",
  ".cur",
  ".tif",
  ".tiff",
  ".apng",
  ".avif",
  ".bmp",
  ".wmf",
  ".gif",
  ".ico",
  ".jpg",
  ".jpeg",
  ".jpe",
  ".jif",
  ".jfif",
  ".png",
  ".svg",
  ".svgz",
  ".tif",
  ".tiff",
  ".webp",
  ".xbm",
].map((s) => s.replace(".", ""));

downloadButton.addEventListener("click", async () => {
  const imageAttributes = await getData("imageAttributes");
  if (!Array.isArray(imageAttributes)) return;

  for (const image of imageAttributes) {
    let filename = image.alt.split("/").pop();
    const filenameExtension = filename.split(".").pop();
    if (filename === filenameExtension) {
      const currentExtension = image.src.split("/").pop().split(".").pop();
      if (supportedExtensions.includes(currentExtension)) {
        filename = [filename, currentExtension].join(".");
      }
    }

    chrome.downloads.download({ url: image.src, filename });
  }
});

clearButton.addEventListener("click", async () => {
  chrome.storage.sync.remove("imageAttributes", () => {
    renderImages();
    notify("Clear Image", "Your images has been cleared");
  });
});

scrapeButton.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      function: scrapeImages,
    },
    renderImages
  );
});

function scrapeImages() {
  const images = Array.from(document.querySelectorAll("img"));
  const imageAttributes = images
    .map((el, id) => {
      const src = el.getAttribute("src");
      let alt = el.getAttribute("alt");

      try {
        // Remove trailing '?' or query string params.
        const url = new URL(src);
        const cleanSrc = url.origin + url.pathname;
        alt = alt || cleanSrc;

        let filename = alt.split("/").pop();
        const filenameExtension = filename.split(".").pop();
        if (filename === filenameExtension) {
          const currentExtension = cleanSrc.split("/").pop().split(".").pop();
          if (supportedExtensions.includes(currentExtension)) {
            filename = [filename, currentExtension].join(".");
          }
        }

        return { src: cleanSrc, alt: filename, id: id.toString() };
      } catch (error) {
        // URL can be invalid.
        return null;
      }
    })
    .filter(Boolean);

  chrome.storage.sync.set({ imageAttributes });
}

async function renderImages() {
  const imageAttributes = await getData("imageAttributes");
  if (Array.isArray(imageAttributes)) {
    renderOutput(imageAttributes.length);

    for (const image of imageAttributes) {
      const { id, src, alt } = image;

      const img = document.createElement("img");
      img.setAttribute("id", id);
      img.setAttribute("src", src);
      img.setAttribute("alt", alt);
      img.setAttribute("width", 400);
      img.setAttribute("height", "auto");

      const div = document.createElement("div");
      const input = document.createElement("input");
      input.value = alt;
      input.dataset.id = id;
      div.appendChild(img);
      div.appendChild(input);

      container.appendChild(div);
    }

    const images = Array.from(container.querySelectorAll("img"));

    for (const image of images) {
      image.addEventListener("click", async (evt) => {
        const el = evt.currentTarget;
        const idToRemove = el.getAttribute("id");
        el.remove();
        document.querySelector(`[data-id="${idToRemove}"]`).remove();

        const imageAttributes = await getData("imageAttributes");
        const remainingImageAttributes = imageAttributes.filter(
          ({ id }) => id !== idToRemove
        );
        chrome.storage.sync.set({ imageAttributes: remainingImageAttributes });
        renderOutput(remainingImageAttributes.length);
      });
    }

    const inputs = Array.from(container.querySelectorAll("input"));
    let timeout = null;
    for (const input of inputs) {
      input.addEventListener("keyup", (evt) => {
        const value = input.value.trim();
        const idToChange = input.dataset.id;

        timeout && clearTimeout(timeout);
        timeout = setTimeout(async () => {
          const imageAttributes = await getData("imageAttributes");

          const updatedImageAttributes = imageAttributes.map(
            ({ id, src, alt }) => {
              return id === idToChange
                ? { id, src, alt: value }
                : { id, src, alt };
            }
          );

          chrome.storage.sync.set({ imageAttributes: updatedImageAttributes });
        }, 250);
      });
    }
  } else {
    container.innerHTML = "";
  }
}

function renderOutput(n = 0) {
  output.innerHTML = n === 1 ? `${n} image` : `${n} images`;
}

async function getData(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(key, (data) => {
      resolve(data[key]);
    });
  });
}

// https://developer.mozilla.org/en-US/docs/Web/API/Notification/Notification
function notify(title, body) {
  // Let's check if the browser supports notifications
  if (!("Notification" in window)) {
    alert("This browser does not support desktop notification");
    return;
  }

  switch (Notification.permission) {
    case "granted":
      return new Notification(title, {
        body,
        icon: "",
        image: "",
      });
    case "denied":
      return;
    default:
      return Notification.requestPermission().then((permission) => {
        // If the user accepts, let's create a notification
        if (permission === "granted") {
          return new Notification(title, {
            body,
            icon: "",
            image: "",
          });
        }
      });
  }
}
