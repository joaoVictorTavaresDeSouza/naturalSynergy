import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { WebSocket } from "ws";
import { createAppServer } from "../server.js";

const DEVICE_TOKEN = "test-device-token-that-is-at-least-32-chars";
const APP_ORIGIN = "https://app.example.test";
let service;
let baseUrl;

function waitForOpen(client) {
    return new Promise((resolve, reject) => {
        client.once("open", resolve);
        client.once("error", reject);
    });
}

function waitForMessage(client) {
    return new Promise((resolve, reject) => {
        client.once("message", (data) => resolve(data.toString("utf8")));
        client.once("error", reject);
    });
}

before(async () => {
    service = createAppServer({
        deviceToken: DEVICE_TOKEN,
        allowedOrigins: [APP_ORIGIN],
    });

    await new Promise((resolve) => {
        service.server.listen(0, "127.0.0.1", resolve);
    });

    const { port } = service.server.address();
    baseUrl = `ws://127.0.0.1:${port}/ws`;
});

after(async () => {
    for (const client of service.webSocketServer.clients) {
        client.terminate();
    }

    await new Promise((resolve) => service.webSocketServer.close(resolve));
    await new Promise((resolve, reject) => {
        service.server.close((error) => error ? reject(error) : resolve());
    });
});

test("health endpoint reports that the backend is ready", async () => {
    const { port } = service.server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
});

test("site connections from unapproved origins are rejected", async () => {
    const client = new WebSocket(`${baseUrl}?from=site`, {
        origin: "https://unapproved.example.test",
    });
    const statusCode = await new Promise((resolve, reject) => {
        client.once("unexpected-response", (_request, response) => {
            response.resume();
            resolve(response.statusCode);
        });
        client.once("open", () => {
            client.close();
            reject(new Error("An unapproved origin was accepted."));
        });
        client.once("error", reject);
    });

    assert.equal(statusCode, 403);
});

test("authenticated ESP telemetry is relayed to read-only site clients", async () => {
    const site = new WebSocket(`${baseUrl}?from=site`, { origin: APP_ORIGIN });
    await waitForOpen(site);

    const esp = new WebSocket(`${baseUrl}?from=esp`);
    await waitForOpen(esp);

    const readyMessage = waitForMessage(esp);
    esp.send(JSON.stringify({ type: "auth", token: DEVICE_TOKEN }));
    assert.deepEqual(JSON.parse(await readyMessage), { type: "ready" });

    const telemetryMessage = waitForMessage(site);
    const telemetry = { type: "telemetry", value: 42 };
    esp.send(JSON.stringify(telemetry));
    assert.deepEqual(JSON.parse(await telemetryMessage), telemetry);

    site.close();
    esp.close();
});

test("ESP connections with an invalid token are closed", async () => {
    const esp = new WebSocket(`${baseUrl}?from=esp`);
    await waitForOpen(esp);

    const closeCode = new Promise((resolve) => {
        esp.once("close", (code) => resolve(code));
    });
    esp.send(JSON.stringify({ type: "auth", token: "invalid-token" }));

    assert.equal(await closeCode, 1008);
});
