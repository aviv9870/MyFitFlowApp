import { toast } from "sonner";

// An installed PWA on Android keeps its JS in memory for days: reopening it
// from the home screen resumes the old page instead of loading a new one. A
// deploy therefore doesn't reach the user until the OS happens to kill the
// app - which is how a fixed save bug kept failing on a phone that was still
// running the pre-fix bundle. Vite fingerprints the entry bundle, so a new
// deploy means index.html references a different /assets/index-*.js; compare
// that against the bundle this page is running and offer a reload.
//
// We prompt instead of reloading on our own: a silent reload would discard an
// in-progress workout or an unsaved edit.

const MIN_CHECK_GAP_MS = 60_000;
const POLL_INTERVAL_MS = 10 * 60_000;

const bundlePath = (src: string) => new URL(src, location.origin).pathname;

const runningBundle = () => {
  const script = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]');
  return script ? bundlePath(script.src) : null;
};

export const startVersionCheck = () => {
  const current = runningBundle();
  if (!import.meta.env.PROD || !current) return;

  let lastCheck = 0;
  let notified = false;

  const check = async () => {
    if (notified || document.visibilityState !== "visible") return;
    if (Date.now() - lastCheck < MIN_CHECK_GAP_MS) return;
    lastCheck = Date.now();
    try {
      const res = await fetch("/index.html", { cache: "no-store" });
      if (!res.ok) return;
      const latest = (await res.text()).match(/src="([^"]*\/assets\/index-[^"]+\.js)"/)?.[1];
      if (!latest || bundlePath(latest) === current) return;
      notified = true;
      toast("גרסה חדשה של האפליקציה זמינה", {
        id: "new-version",
        duration: Infinity,
        description: "כדאי לעדכן לפני שממשיכים",
        action: { label: "עדכן", onClick: () => location.reload() },
      });
    } catch {
      // Offline or a transient network error - try again on the next trigger.
    }
  };

  document.addEventListener("visibilitychange", check);
  window.addEventListener("focus", check);
  setInterval(check, POLL_INTERVAL_MS);
};
