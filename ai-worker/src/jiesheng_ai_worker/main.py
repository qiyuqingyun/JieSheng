from __future__ import annotations

import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any


class AiWorkerHandler(BaseHTTPRequestHandler):
    server: "AiWorkerServer"

    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _authorized(self) -> bool:
        return self.headers.get("Authorization") == f"Bearer {self.server.token}"

    def do_GET(self) -> None:
        if self.path != "/health":
            self._send_json(404, {"ok": False, "error": "not found"})
            return
        if not self._authorized():
            self._send_json(401, {"ok": False, "error": "unauthorized"})
            return
        self._send_json(200, {"ok": True, "worker": "jiesheng-ai-worker"})

    def do_POST(self) -> None:
        if not self._authorized():
            self._send_json(401, {"ok": False, "error": "unauthorized"})
            return
        self._send_json(
            501,
            {
                "ok": False,
                "error": "AI worker RPC is reserved for future AI/RAG features.",
            },
        )

    def log_message(self, _format: str, *_args: Any) -> None:
        return


class AiWorkerServer(ThreadingHTTPServer):
    def __init__(self, address: tuple[str, int], token: str) -> None:
        super().__init__(address, AiWorkerHandler)
        self.token = token


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--token", required=True)
    args = parser.parse_args()

    server = AiWorkerServer((args.host, args.port), args.token)
    server.serve_forever()


if __name__ == "__main__":
    main()

