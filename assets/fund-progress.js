/* Fills every [data-fund-progress] block from /fund/progress.json, which the
   3-hourly Stripe job keeps current. The block stays hidden if the file can't be read. */
(function () {
  var blocks = document.querySelectorAll("[data-fund-progress]");
  if (!blocks.length) return;
  var GOAL = 11000, ar = document.documentElement.lang === "ar";
  fetch("/fund/progress.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (p) {
    var raised = Number(p.raised_aud) || 0, n = Number(p.supporters) || 0;
    var pct = Math.min(100, Math.round(raised / GOAL * 100));
    var amt = "A$" + raised.toLocaleString("en-AU");
    blocks.forEach(function (b) {
      b.querySelector("[data-raised]").textContent = ar
        ? "تم جمع " + amt + " من " + n + " داعمين حتى الآن (" + pct + "%)"
        : amt + " raised so far from " + n + " supporters (" + pct + "%)";
      b.querySelector("i").style.width = Math.max(pct, 2) + "%";
      b.hidden = false;
    });
  }).catch(function () {});
})();
