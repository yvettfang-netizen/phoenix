export async function confirmPrivateDelivery(response: Response, signal: AbortSignal) {
  const receipt = response.headers.get("X-Phoenix-Delivery-Receipt");
  if (!receipt) throw new Error("Private delivery receipt is missing");

  const confirmation = await fetch("/api/family-services/delivery-receipt", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ receipt }),
    signal,
  });
  if (confirmation.status !== 204) {
    throw Object.assign(new Error("Private delivery confirmation failed"), { status: confirmation.status });
  }
}
