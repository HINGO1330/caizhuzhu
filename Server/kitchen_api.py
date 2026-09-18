from __future__ import annotations

import base64
from dataclasses import dataclass
from enum import Enum
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import re
from typing import Any
from urllib.parse import urlparse


class ImportKind(str, Enum):
    TEXT = "text"
    URL = "url"
    IMAGE = "image"
    IMAGES = "images"


@dataclass(slots=True)
class ParseError(ValueError):
    code: str
    message: str

    def __str__(self) -> str:
        return self.message


def parse_import(payload: dict[str, Any]) -> dict[str, Any]:
    raw_kind = payload.get("kind")
    try:
        kind = ImportKind(raw_kind)
    except (TypeError, ValueError) as error:
        raise ParseError("unsupported_kind", "不支持的导入类型") from error

    if kind in {ImportKind.IMAGE, ImportKind.IMAGES}:
        image_references = _parse_images(payload, kind)
        normalized = ""
        name = "图片导入"
        ingredients: list[dict[str, str]] = []
        steps: list[str] = []
        warnings = [
            {
                "code": "ocr_unavailable",
                "message": "当前零依赖解析器不提供 OCR，请人工补充并确认内容",
            }
        ]
    else:
        content = payload.get("content")
        if not isinstance(content, str) or not content.strip():
            raise ParseError("empty_content", "导入内容不能为空")
        normalized = content.strip()
        image_references = []
        warnings = []

    if kind is ImportKind.URL:
        parsed = urlparse(normalized)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ParseError("invalid_url", "链接必须使用 http 或 https")
        name = parsed.netloc
        ingredients = []
        steps = []
    elif kind is ImportKind.TEXT:
        name, ingredients, steps = _parse_text(normalized)

    return {
        "status": "needs_confirmation",
        "can_save_without_confirmation": False,
        "recipe": {
            "name": name,
            "summary": "",
            "ingredients": ingredients,
            "steps": steps,
            "servings": None,
            "duration_minutes": None,
            "image_references": image_references,
            "tags": [],
            "source": normalized if kind is ImportKind.URL else None,
        },
        "warnings": warnings,
    }


_STEP_PATTERN = re.compile(r"^\s*\d+[.、)]\s*(.+)$")
_INGREDIENT_PATTERN = re.compile(
    r"^\s*(.+?)\s+(\d+(?:\.\d+)?)\s*([^\d\s]+)\s*$"
)


def _parse_text(content: str) -> tuple[str, list[dict[str, str]], list[str]]:
    lines = [line.strip() for line in content.splitlines() if line.strip()]
    name = lines[0]
    ingredients: list[dict[str, str]] = []
    steps: list[str] = []
    for line in lines[1:]:
        if step_match := _STEP_PATTERN.match(line):
            steps.append(step_match.group(1).strip())
        elif ingredient_match := _INGREDIENT_PATTERN.match(line):
            ingredients.append(
                {
                    "name": ingredient_match.group(1).strip(),
                    "quantity": ingredient_match.group(2),
                    "unit": ingredient_match.group(3).strip(),
                }
            )
    return name, ingredients, steps


def _parse_images(payload: dict[str, Any], kind: ImportKind) -> list[dict[str, Any]]:
    images = payload.get("images")
    if kind is ImportKind.IMAGE and images is None:
        single = payload.get("image")
        images = [single] if single is not None else None
    if not isinstance(images, list) or not images:
        raise ParseError("empty_images", "至少需要一张图片")
    if len(images) > 20:
        raise ParseError("too_many_images", "单次最多导入 20 张图片")

    references: list[dict[str, Any]] = []
    for index, image in enumerate(images):
        if not isinstance(image, dict):
            raise ParseError("invalid_image", f"第 {index + 1} 张图片格式无效")
        media_type = image.get("media_type")
        encoded = image.get("data_base64")
        if media_type not in {"image/jpeg", "image/png", "image/heic"}:
            raise ParseError("unsupported_image_type", f"第 {index + 1} 张图片类型不受支持")
        if not isinstance(encoded, str):
            raise ParseError("invalid_image", f"第 {index + 1} 张图片缺少 base64 数据")
        try:
            decoded = base64.b64decode(encoded, validate=True)
        except (ValueError, base64.binascii.Error) as error:
            raise ParseError("invalid_image", f"第 {index + 1} 张图片数据无效") from error
        if not decoded:
            raise ParseError("invalid_image", f"第 {index + 1} 张图片不能为空")
        references.append(
            {
                "index": index,
                "media_type": media_type,
                "sha256": hashlib.sha256(decoded).hexdigest(),
            }
        )
    return references


def _json_bytes(value: dict[str, Any]) -> bytes:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def handle_request(method: str, path: str, body: bytes) -> tuple[int, bytes]:
    if method == "GET" and path == "/healthz":
        return 200, _json_bytes({"status": "ok"})
    if method != "POST" or path != "/v1/import/parse":
        return 404, _json_bytes(
            {"error": {"code": "not_found", "message": "接口不存在"}}
        )

    try:
        payload = json.loads(body)
    except (UnicodeDecodeError, json.JSONDecodeError):
        return 400, _json_bytes(
            {"error": {"code": "invalid_json", "message": "请求体必须是有效 JSON"}}
        )

    if not isinstance(payload, dict):
        return 400, _json_bytes(
            {"error": {"code": "invalid_payload", "message": "请求体必须是 JSON 对象"}}
        )

    try:
        return 200, _json_bytes(parse_import(payload))
    except ParseError as error:
        return 422, _json_bytes(
            {"error": {"code": error.code, "message": error.message}}
        )


class ImportRequestHandler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:
        content_length = int(self.headers.get("Content-Length", "0"))
        status, body = handle_request("POST", self.path, self.rfile.read(content_length))
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        status, body = handle_request("GET", self.path, b"")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        return


def serve(host: str = "127.0.0.1", port: int = 8080) -> None:
    ThreadingHTTPServer((host, port), ImportRequestHandler).serve_forever()


if __name__ == "__main__":
    serve()
