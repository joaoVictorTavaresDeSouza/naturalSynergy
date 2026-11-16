import "dotenv/config";
import { timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import express from "express";
import { WebSocket, WebSocketServer } from "ws";

const MIN_TOKEN_LENGTH = 32;
const MAX_MESSAGE_BYTES = 16 * 1024;
const AUTH_TIMEOUT_MS = 5000;

function createOriginSet(origins) {
    if (!Array.isArray(origins) || origins.length === 0) {
        throw new Error("Configure at least one APP_ORIGINS value.");
    }

    return new Set(origins.map((origin) => {
        const parsedOrigin = new URL(origin);
        if (!["http:", "https:"].includes(parsedOrigin.protocol) || parsedOrigin.origin !== origin) {
            throw new Error("APP_ORIGINS must contain only exact HTTP or HTTPS origins.");
        }
        return parsedOrigin.origin;
    }));
}

function tokenMatches(candidate, expected) {
    if (typeof candidate !== "string") {
        return false;
    }

    const candidateBytes = Buffer.from(candidate);
    const expectedBytes = Buffer.from(expected);
    return candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes);
}

function rejectUpgrade(socket, statusCode) {
    const reasons = {
        400: "Bad Request",
        403: "Forbidden",
        404: "Not Found",
    };
    const reason = reasons[statusCode] || "Bad Request";

    if (!socket.destroyed) {
        socket.end(`HTTP/1.1 ${statusCode} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    }
}

export function createAppServer({ deviceToken, allowedOrigins }) {
    if (typeof deviceToken !== "string" || deviceToken.length < MIN_TOKEN_LENGTH) {
        throw new Error(`WS_DEVICE_TOKEN must contain at least ${MIN_TOKEN_LENGTH} characters.`);
    }

    const originSet = createOriginSet(allowedOrigins);
    const app = express();
    app.disable("x-powered-by");
    app.get("/health", (_request, response) => {
        response.json({ status: "ok" });
    });

    const server = createServer(app);
    const webSocketServer = new WebSocketServer({
        noServer: true,
        maxPayload: MAX_MESSAGE_BYTES,
    });

    server.on("upgrade", (request, socket, head) => {
        let requestUrl;
        try {
            requestUrl = new URL(request.url || "/", "http://localhost");
        } catch {
            rejectUpgrade(socket, 400);
            return;
        }

        const role = requestUrl.searchParams.get("from");
        if (requestUrl.pathname !== "/ws") {
            rejectUpgrade(socket, 404);
            return;
        }
        if (role !== "esp" && role !== "site") {
            rejectUpgrade(socket, 400);
            return;
        }
        if (role === "site" && !originSet.has(request.headers.origin || "")) {
            rejectUpgrade(socket, 403);
            return;
        }
        if (role === "esp" && request.headers.origin) {
            rejectUpgrade(socket, 403);
            return;
        }

        webSocketServer.handleUpgrade(request, socket, head, (client) => {
            client.role = role;
            webSocketServer.emit("connection", client, request);
        });
    });

    webSocketServer.on("connection", (client) => {
        let authenticated = client.role === "site";
        let authTimer;

        if (client.role === "esp") {
            authTimer = setTimeout(() => {
                client.close(1008, "Authentication required.");
            }, AUTH_TIMEOUT_MS);
        }

        client.on("message", (data, isBinary) => {
            if (isBinary) {
                client.close(1003, "Text messages only.");
                return;
            }

            let payload;
            try {
                payload = JSON.parse(data.toString("utf8"));
            } catch {
                client.close(1007, "Invalid JSON.");
                return;
            }

            if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
                client.close(1007, "A JSON object is required.");
                return;
            }

            if (client.role === "esp" && !authenticated) {
                if (payload.type !== "auth" || !tokenMatches(payload.token, deviceToken)) {
                    client.close(1008, "Authentication failed.");
                    return;
                }

                authenticated = true;
                clearTimeout(authTimer);
                client.send(JSON.stringify({ type: "ready" }));
                return;
            }

            if (client.role !== "esp" || !authenticated) {
                client.close(1008, "This connection is read-only.");
                return;
            }

            const message = JSON.stringify(payload);
            for (const recipient of webSocketServer.clients) {
                if (recipient.role === "site" && recipient.readyState === WebSocket.OPEN) {
                    recipient.send(message);
                }
            }
        });

        client.on("close", () => clearTimeout(authTimer));
        client.on("error", (error) => {
            console.error("WebSocket client error:", error.message);
        });
    });

    return { app, server, webSocketServer };
}

export function startBackend(environment = process.env) {
    const port = Number(environment.PORT || 8080);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("PORT must be an integer between 1 and 65535.");
    }

    const allowedOrigins = (environment.APP_ORIGINS || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
    const service = createAppServer({
        deviceToken: environment.WS_DEVICE_TOKEN,
        allowedOrigins,
    });

    service.server.listen(port, "0.0.0.0", () => {
        console.log(`Natural Synergy WebSocket backend listening on port ${port}.`);
    });

    return service;
}

const isMainModule = process.argv[1] &&
    pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isMainModule) {
    startBackend();
}
