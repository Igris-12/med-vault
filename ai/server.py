# ⚠️ DISCLAIMER
# This script is intended strictly for educational and experimental purposes only.
# Do NOT use this on your personal browser profile or with your main account on the target website.
# Automating interactions with production websites may violate their Terms of Service (ToS).
# Misuse of such scripts can lead to account bans or legal consequences.
# The author is not responsible for any misuse or damage caused by this script.
# Only works with one site
# Version 2.6; Cross-platform

import time
from dotenv import load_dotenv
import os
from playwright.sync_api import sync_playwright
from flask import Flask, jsonify, request
import base64
from pathlib import Path
from flask_cors import CORS
import platform
import threading

load_dotenv()

app = Flask(__name__)
CORS(app)
playwright = None
browser = None
page = None

# Serialize Playwright operations — browser is single-threaded
_playwright_lock = threading.Lock()

# Cached selector so we only detect once
cached_selector = None

# MIME type → file extension mapping
MIME_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/mp4": ".m4a",
    "audio/webm": ".webm",
    "video/webm": ".webm",
}

# Create uploads folder if it doesn't exist
UPLOAD_FOLDER = "uploaded_images"
Path(UPLOAD_FOLDER).mkdir(exist_ok=True)

def find_textbox():
    """Auto-detect the input textbox — cached after first find so its instant every time"""
    global cached_selector

    # If we already found it before, use it directly — no delay
    if cached_selector:
        try:
            if cached_selector[0] == 'role':
                el = page.get_by_role("textbox", name=cached_selector[1])
            else:
                el = page.locator(cached_selector[1]).last
            return el
        except:
            cached_selector = None

    # First time only — try all selectors with short 1s timeout
    selectors = [
        ('role', 'Enter a prompt here'),
        ('role', 'Ask Gemini'),
        ('role', 'Message'),
        ('role', 'prompt'),
        ('css', 'div[role="textbox"]'),
        ('css', 'div[contenteditable="true"]'),
        ('css', 'p[data-placeholder]'),
        ('css', 'textarea'),
        ('css', '[aria-label*="prompt"]'),
        ('css', '[aria-label*="message"]'),
        ('css', '[aria-label*="Gemini"]'),
        ('css', '[aria-label*="Ask"]'),
    ]

    for selector_type, selector in selectors:
        try:
            if selector_type == 'role':
                el = page.get_by_role("textbox", name=selector)
                el.wait_for(timeout=1000)
            else:
                el = page.locator(selector).last
                el.wait_for(timeout=1000)
            print(f"✅ Found textbox: {selector_type}='{selector}'")
            cached_selector = (selector_type, selector)
            return el
        except:
            continue

    return None


def init_page():
    global playwright, browser, user_data_dir, page

    playwright = sync_playwright().start()
    browser = playwright.chromium.launch_persistent_context(
        user_data_dir=os.getenv("USER_DATA_DIR"),
        headless=False,
        args=[
            "--disable-blink-features=AutomationControlled",
            "--start-maximized",
            "--no-default-browser-check",
            "--disable-default-apps",
            "--disable-extensions",
        ],
        viewport={"width": 1280, "height": 800}
    )

    page = browser.new_page()
    system = platform.system()

    if system == "Windows":
        platform_name = "Win32"
    elif system == "Darwin":
        platform_name = "MacIntel"
    else:
        platform_name = "Linux x86_64"

    page.add_init_script(f"""
        Object.defineProperty(navigator, 'webdriver', {{ get: () => undefined }});
        Object.defineProperty(navigator, 'languages', {{ get: () => ['en-US', 'en'] }});
        Object.defineProperty(navigator, 'platform', {{ get: () => '{platform_name}' }});
        Object.defineProperty(navigator, 'plugins', {{ get: () => [1, 2, 3, 4] }});
    """)

    page.goto(os.getenv("SITE"), timeout=120000)
    time.sleep(3)

    try:
        locater = page.locator('//span[text()="No thanks"]')
        locater.first.click(timeout=3000)
    except:
        pass

    page.mouse.move(640, 400)
    page.mouse.click(640, 400)

    print("🔍 Detecting input box selector...")
    find_textbox()
    print("✅ Ready!")


@app.route('/receive', methods=['POST'])
def receive_request():
    global playwright, browser, page

    data = request.get_json(force=True)
    query = data.get("query")

    with _playwright_lock:
        textbox = find_textbox()
        if textbox is None:
            return jsonify({"status": "error", "message": "Could not find input box"}), 500

        textbox.click()
        time.sleep(0.3)
        textbox.fill(query)
        time.sleep(0.3)
        textbox.press("Enter")

        page.wait_for_selector(
            '.text-input-field >> xpath=preceding::span[contains(@class, "user-query-bubble-with-background")][1]/following::div[@data-test-lottie-animation-status="completed"][1]',
            timeout=600000
        )

        locater = page.locator('xpath=(//div[contains(@class, "text-input-field")])[1]/preceding::message-content[1]')
        locater.wait_for(timeout=600000)
        response = locater.inner_text()

    return jsonify({"status": "success", "response": response})


@app.route('/img', methods=['POST'])
def receive_img():
    global playwright, browser, page
    data = request.get_json(force=True)
    query = data.get("query")
    base64_image = data.get("image")
    mime_type = data.get("mime_type", "image/jpeg")

    if not base64_image:
        return jsonify({"status": "error", "message": "No file provided"}), 400

    # Determine correct file extension from MIME type
    ext = MIME_EXTENSIONS.get(mime_type.lower(), ".bin")
    timestamp = int(time.time() * 1000)
    image_path = os.path.join(UPLOAD_FOLDER, f"upload_{timestamp}{ext}")

    try:
        raw_b64 = base64_image.split(",")[1] if "," in base64_image else base64_image
        file_data = base64.b64decode(raw_b64)

        with open(image_path, "wb") as f:
            f.write(file_data)

        print(f"✅ File saved: {image_path} ({mime_type})")

    except Exception as e:
        return jsonify({"status": "error", "message": f"Failed to decode/save file: {str(e)}"}), 400

    try:
        with _playwright_lock:
            textbox = find_textbox()
            if textbox is None:
                return jsonify({"status": "error", "message": "Could not find input box"}), 500

            textbox.click()
            time.sleep(0.3)
            textbox.fill(query)
            time.sleep(0.3)

            upload_button = page.locator('button[aria-label="Open upload file menu"].upload-card-button.open')
            upload_button.wait_for(timeout=60000)
            upload_button.click()
            time.sleep(0.5)

            upload_files_menu_item = page.locator("div.menu-text", has_text="Upload files")
            upload_files_menu_item.wait_for(timeout=60000)
            upload_files_menu_item.click()
            time.sleep(0.5)

            file_input = page.locator('input[type="file"]')
            absolute_path = os.path.abspath(image_path)
            file_input.set_input_files(absolute_path)
            print(f"✅ File uploaded from: {absolute_path}")

            time.sleep(2)  # Wait for upload to complete
            textbox.click()
            textbox.press("Enter")

            page.wait_for_selector(
                '.text-input-field >> xpath=preceding::span[contains(@class, "user-query-bubble-with-background")][1]/following::div[@data-test-lottie-animation-status="completed"][1]',
                timeout=600000
            )

            locater = page.locator('xpath=(//div[contains(@class, "text-input-field")])[1]/preceding::message-content[1]')
            locater.wait_for(timeout=600000)
            response = locater.inner_text()

        return jsonify({"status": "success", "response": response})

    except Exception as e:
        print(f"❌ Playwright error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

    finally:
        # Always clean up temp file, even on error
        try:
            os.remove(image_path)
            print(f"🗑️  Cleaned up: {image_path}")
        except Exception:
            pass


if __name__ == "__main__":
    init_page()
    # threaded=True so /receive and /img don't block each other at the Flask level.
    # The _playwright_lock ensures only one Playwright operation runs at a time.
    app.run(host='0.0.0.0', port=5000, threaded=True)
