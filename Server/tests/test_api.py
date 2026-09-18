import json
import unittest

from Server.kitchen_api import ImportKind, ParseError, handle_request, parse_import


class ParseImportTests(unittest.TestCase):
    def test_text_import_extracts_title_and_keeps_manual_confirmation_required(self):
        result = parse_import(
            {
                "kind": "text",
                "content": "番茄炒蛋\n番茄 2个\n鸡蛋 3个\n1. 鸡蛋炒熟\n2. 加入番茄",
            }
        )

        self.assertEqual(result["recipe"]["name"], "番茄炒蛋")
        self.assertEqual(result["status"], "needs_confirmation")
        self.assertFalse(result["can_save_without_confirmation"])

    def test_text_import_extracts_ingredients_and_numbered_steps(self):
        result = parse_import(
            {
                "kind": "text",
                "content": "番茄炒蛋\n番茄 2个\n鸡蛋 3个\n1. 鸡蛋炒熟\n2. 加入番茄",
            }
        )

        self.assertEqual(
            result["recipe"]["ingredients"],
            [
                {"name": "番茄", "quantity": "2", "unit": "个"},
                {"name": "鸡蛋", "quantity": "3", "unit": "个"},
            ],
        )
        self.assertEqual(
            result["recipe"]["steps"],
            ["鸡蛋炒熟", "加入番茄"],
        )

    def test_multiple_images_are_preserved_for_manual_confirmation(self):
        result = parse_import(
            {
                "kind": "images",
                "images": [
                    {"media_type": "image/jpeg", "data_base64": "/9j/AA=="},
                    {"media_type": "image/png", "data_base64": "iVBORw=="},
                ],
            }
        )

        self.assertEqual(len(result["recipe"]["image_references"]), 2)
        self.assertEqual(result["warnings"][0]["code"], "ocr_unavailable")

    def test_url_import_rejects_non_http_scheme(self):
        with self.assertRaises(ParseError) as caught:
            parse_import({"kind": ImportKind.URL.value, "content": "file:///secret"})

        self.assertEqual(caught.exception.code, "invalid_url")

    def test_missing_content_returns_structured_validation_error(self):
        with self.assertRaises(ParseError) as caught:
            parse_import({"kind": "text", "content": "  "})

        self.assertEqual(caught.exception.code, "empty_content")


class HTTPContractTests(unittest.TestCase):
    def test_health_endpoint_reports_service_ready(self):
        status, body = handle_request("GET", "/healthz", b"")

        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), {"status": "ok"})

    def test_parse_endpoint_returns_json_candidate(self):
        status, body = handle_request(
            "POST",
            "/v1/import/parse",
            json.dumps({"kind": "url", "content": "https://example.com/recipe"}).encode(),
        )

        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["status"], "needs_confirmation")

    def test_malformed_json_returns_structured_error(self):
        status, body = handle_request("POST", "/v1/import/parse", b"{")

        self.assertEqual(status, 400)
        self.assertEqual(json.loads(body)["error"]["code"], "invalid_json")

    def test_unknown_route_returns_not_found(self):
        status, body = handle_request("GET", "/healthz/unknown", b"")

        self.assertEqual(status, 404)
        self.assertEqual(json.loads(body)["error"]["code"], "not_found")


if __name__ == "__main__":
    unittest.main()
