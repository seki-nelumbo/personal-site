const card = document.querySelector("#christmas-letter");
const cardRecipient = document.querySelector("#card-recipient");
const cardMessage = document.querySelector("#card-message");
const cardSender = document.querySelector("#card-sender");
const treeCard = document.querySelector("#tree-card");
const form = document.querySelector("#card-form");
const shareResult = document.querySelector("#share-result");
const shareFields = document.querySelector("#share-fields");
const shareLink = document.querySelector("#share-link");
const shareStatus = document.querySelector("#share-status");

const defaultCard = {
  recipient: cardRecipient.textContent,
  message: cardMessage.textContent,
  sender: cardSender.textContent,
};

function readGreeting(params) {
  return {
    to: (params.get("to") || "").trim().slice(0, 24),
    from: (params.get("from") || "").trim().slice(0, 24),
    wish: (params.get("wish") || "").trim().slice(0, 160),
  };
}

function showGreeting(greeting) {
  cardRecipient.textContent = greeting.to ? "给 " + greeting.to : defaultCard.recipient;
  cardMessage.textContent = greeting.wish || defaultCard.message;
  cardSender.textContent = greeting.from ? "—— " + greeting.from : defaultCard.sender;
  treeCard.setAttribute("aria-label", greeting.to ? "打开给 " + greeting.to + " 的贺卡" : "打开贺卡");
}

showGreeting(readGreeting(new URLSearchParams(window.location.search)));

for (const button of document.querySelectorAll("[data-open-card]")) {
  button.addEventListener("click", () => {
    if (!card.open) card.showModal();
  });
}
card.addEventListener("click", (event) => {
  if (event.target === card) card.close();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const greeting = readGreeting(new FormData(form));
  showGreeting(greeting);
  shareResult.hidden = false;

  if (window.location.protocol === "file:") {
    shareStatus.textContent = "祝福卡已生成。把网站发布到网上后，就可以复制分享链接。";
    return;
  }

  const url = new URL(window.location.href);
  url.search = "";
  for (const [key, value] of Object.entries(greeting)) {
    if (value) url.searchParams.set(key, value);
  }
  url.hash = "greeting";

  shareLink.value = url.href;
  shareFields.hidden = false;
  shareStatus.textContent = "朋友打开链接后，点树上的贺卡就能读到你的祝福。";
});

document.querySelector("#copy-link").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareLink.value);
    shareStatus.textContent = "链接已复制，可以发给朋友了。";
  } catch {
    shareLink.focus();
    shareLink.select();
    shareStatus.textContent = "已选中链接，请长按或按 Ctrl+C 复制。";
  }
});
