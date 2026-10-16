export async function registerOffline() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  await navigator.serviceWorker.register(new URL('sw.js', document.baseURI), { scope: './' });
}
