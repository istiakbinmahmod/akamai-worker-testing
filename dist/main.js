import { createResponse } from 'create-response';
import { atob, btoa, base64, base64url, base16, TextEncoder, TextDecoder } from 'encoding';
import { crypto } from 'crypto';

globalThis.createResponse = createResponse;
globalThis.atob = atob;
globalThis.btoa = btoa;
globalThis.base64 = base64;
globalThis.base64url = base64url;
globalThis.base16 = base16;
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
globalThis.crypto = crypto;


// src/main.js
import { EdgeKV } from "./edgekv.js";
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}
async function verifyWebhookSignature(payload, signature, secret) {
  if (!signature?.startsWith("sha1=")) {
    return false;
  }
  const cleanSig = signature.substring(5);
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["verify"]
  );
  const signatureBytes = hexToBytes(cleanSig);
  const payloadBytes = encoder.encode(payload);
  return await crypto.subtle.verify(
    "HMAC",
    cryptoKey,
    signatureBytes,
    payloadBytes
  );
}
async function responseProvider(request) {
  try {
    if (request.method !== "POST") {
      return createResponse(
        405,
        { "Content-Type": ["text/plain"] },
        "Oh please send a POST request with JSON body containing webhook payload!!"
      );
    }
    let payload;
    let body;
    try {
      body = await request.text();
      payload = JSON.parse(body);
    } catch (parseError) {
      return createResponse(
        400,
        { "Content-Type": ["text/plain"] },
        "Invalid JSON body: " + parseError.message
      );
    }
    if (payload.event !== "project.web_sdk_artifact_upload") {
      return createResponse(
        200,
        { "Content-Type": ["text/plain"] },
        "Event ignored"
      );
    }
    const key = payload.project_id ? String(payload.project_id) : null;
    const value = JSON.stringify(payload.data);
    if (!key || !value) {
      return createResponse(
        400,
        { "Content-Type": ["text/plain"] },
        "Missing key or value in request body"
      );
    }
    const signature = request.getHeader("X-Hub-Signature")[0];
    const secret = "RKQcsROhPZOg5IBPul5KfbWayllEnYd2n1rL3xiYnYU";
    const isValidSignature = await verifyWebhookSignature(body, signature, secret);
    if (!isValidSignature) {
      return createResponse(
        401,
        { "Content-Type": ["text/plain"] },
        "Invalid webhook signature"
      );
    }
    const edgeKv = new EdgeKV({ namespace: "default", group: "default" });
    try {
      await edgeKv.putText({ item: key, value });
      return createResponse(
        200,
        { "Content-Type": ["text/plain"] },
        "Successfully updated key: " + key
      );
    } catch (kvError) {
      return createResponse(
        500,
        { "Content-Type": ["text/plain"] },
        "Failed to update EdgeKV: " + kvError.message
      );
    }
  } catch (error) {
    return createResponse(
      500,
      { "Content-Type": ["text/plain"] },
      "Internal server error: " + error.message
    );
  }
}
export {
  responseProvider
};
