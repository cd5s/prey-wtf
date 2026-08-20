(function () {
  const bg = document.querySelector(".bg");
  if (!bg) return;

  const orbs = [...bg.querySelectorAll(".orb")];
  const dots = bg.querySelector(".dots");
  let mx = 0;
  let my = 0;
  let tx = 0;
  let ty = 0;
  let raf = 0;

  document.addEventListener("mousemove", (e) => {
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function tick() {
    tx += (mx - tx) * 0.04;
    ty += (my - ty) * 0.04;
    const t = Date.now() * 0.001;

    orbs.forEach((orb, i) => {
      const driftX = Math.sin(t * (0.35 + i * 0.12) + i) * (28 + i * 10);
      const driftY = Math.cos(t * (0.28 + i * 0.1) + i * 2) * (22 + i * 8);
      const px = tx * (18 + i * 8) + driftX;
      const py = ty * (14 + i * 6) + driftY;
      orb.style.transform = `translate3d(${px}px, ${py}px, 0) scale(${1 + Math.sin(t + i) * 0.06})`;
    });

    if (dots) {
      const dx = Math.sin(t * 0.15) * 18 + tx * 6;
      const dy = Math.cos(t * 0.12) * 14 + ty * 5;
      dots.style.backgroundPosition = `${dx}px ${dy}px`;
    }

    raf = requestAnimationFrame(tick);
  }

  tick();
  window.addEventListener("beforeunload", () => cancelAnimationFrame(raf));
})();
