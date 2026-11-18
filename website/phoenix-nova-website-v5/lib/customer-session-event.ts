const SESSION_ENDED = "phoenix:customer-session-ended";

function openSessionChannel() {
  try { return new BroadcastChannel(SESSION_ENDED); }
  catch { return null; }
}

export function notifyCustomerSessionEnded() {
  window.dispatchEvent(new Event(SESSION_ENDED));
  try {
    // An opaque signal only. Never publish the account, cookie or session ID.
    const storage = window.localStorage;
    storage.setItem(SESSION_ENDED, crypto.randomUUID());
    storage.removeItem(SESSION_ENDED);
    return;
  } catch {
    // Browsers may disable storage while still allowing same-origin messaging.
    const channel = openSessionChannel();
    try { channel?.postMessage(SESSION_ENDED); }
    catch { /* The same-document notification already cleared local state. */ }
    finally { channel?.close(); }
  }
}

export function onCustomerSessionEnded(clear: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SESSION_ENDED && event.newValue !== null) clear();
  };
  const channel = openSessionChannel();
  const onMessage = (event: MessageEvent) => {
    if (event.data === SESSION_ENDED) clear();
  };
  window.addEventListener(SESSION_ENDED, clear);
  window.addEventListener("storage", onStorage);
  channel?.addEventListener("message", onMessage);
  return () => {
    window.removeEventListener(SESSION_ENDED, clear);
    window.removeEventListener("storage", onStorage);
    channel?.close();
  };
}
