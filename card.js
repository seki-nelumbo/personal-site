const card = document.querySelector("#christmas-letter");
const composer = document.querySelector("#compose");
const giftDialog = document.querySelector("#gift-dialog");
const cardRecipient = document.querySelector("#card-recipient");
const cardMessage = document.querySelector("#card-message");
const cardSender = document.querySelector("#card-sender");
const treeCard = document.querySelector("#tree-card");
const form = document.querySelector("#card-form");
const shareResult = document.querySelector("#share-result");
const shareFields = document.querySelector("#share-fields");
const shareLink = document.querySelector("#share-link");
const shareStatus = document.querySelector("#share-status");
let previewTrigger = null;
let readingDeliveredLetter = false;

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

document.querySelector("#open-compose").addEventListener("click", () => {
  composer.showModal();
});
document.querySelector("#green-gift").addEventListener("click", () => {
  giftDialog.showModal();
});
for (const button of document.querySelectorAll("[data-open-card]")) {
  button.addEventListener("click", () => {
    if (card.open) return;
    readingDeliveredLetter = button === treeCard;
    if (composer.open) {
      previewTrigger = button;
      composer.close();
    }
    card.showModal();
  });
}
card.addEventListener("close", () => {
  if (readingDeliveredLetter) {
    readingDeliveredLetter = false;
    treeCard.dispatchEvent(new Event("greeting-read"));
  }
  if (!previewTrigger) return;
  const trigger = previewTrigger;
  previewTrigger = null;
  composer.showModal();
  trigger.focus();
});
for (const dialog of [card, composer, giftDialog]) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const greeting = readGreeting(new FormData(form));
  showGreeting(greeting);
  shareResult.hidden = false;

  if (window.location.protocol === "file:") {
    shareStatus.textContent = "祝福卡已生成，上线后即可复制分享链接";
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
  shareStatus.textContent = "朋友滑动后，等雪橇停稳就能拆开你的贺卡";
});

document.querySelector("#copy-link").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareLink.value);
    shareStatus.textContent = "链接已复制，可以发给朋友了";
  } catch {
    shareLink.focus();
    shareLink.select();
    shareStatus.textContent = "已选中链接，请长按或按 Ctrl+C 复制";
  }
});
