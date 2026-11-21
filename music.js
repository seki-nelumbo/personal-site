(() => {
  const music = document.querySelector("#background-music");
  const toggle = document.querySelector("#toggle-music");
  const initialPlayback = new AbortController();

  function updateToggle() {
    toggle.setAttribute("aria-pressed", String(!music.paused && !music.error));
  }

  for (const event of ["play", "pause", "error"]) {
    music.addEventListener(event, updateToggle);
  }
  music.addEventListener("play", () => initialPlayback.abort(), { once: true });

  async function playMusic() {
    try {
      await music.play();
    } catch {
      updateToggle();
    }
  }

  function playOnInteraction(event) {
    if (event.isTrusted && music.paused && !toggle.contains(event.target)) {
      playMusic();
    }
  }

  for (const event of ["pointerup", "touchend", "click", "keydown"]) {
    document.addEventListener(event, playOnInteraction, { signal: initialPlayback.signal });
  }

  toggle.addEventListener("click", () => {
    initialPlayback.abort();
    if (music.paused) playMusic();
    else music.pause();
  });

  toggle.hidden = false;
  playMusic();
})();
