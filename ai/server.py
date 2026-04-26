# ⚠️ DISCLAIMER
# This script is intended strictly for educational and experimental purposes only.
# Do NOT use this on your personal browser profile or with your main account on the target website.
# Automating interactions with production websites may violate their Terms of Service (ToS).
# Misuse of such scripts can lead to account bans or legal consequences.
# The author is not responsible for any misuse or damage caused by this script.
# Only works with one site
# Version 2.7; Cross-platform + Cloudinary image upload

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
import requests as http_requests
import hashlib
import hmac
import subprocess
from PIL import Image as PILImage

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


def is_browser_alive():
    """Quick check whether the Playwright page is still usable."""
    try:
        page.title()  # lightweight call — throws if connection is dead
        return True
    except Exception:
        return False


def reconnect_browser():
    """Tear down the dead browser and re-launch from scratch."""
    global playwright, browser, page, cached_selector
    print("\n🔄 Browser connection lost — reconnecting…")
    cached_selector = None
    # Try to close gracefully
    try:
        browser.close()
    except Exception:
        pass
    try:
        playwright.stop()
    except Exception:
        pass
    # Re-init
    init_page()
    print("✅ Browser reconnected!\n")

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
    "audio/webm;codecs=opus": ".webm",
    "video/webm": ".webm",
}

# Create uploads folder
UPLOAD_FOLDER = "uploaded_images"
Path(UPLOAD_FOLDER).mkdir(exist_ok=True)

# ─── Cloudinary helpers ────────────────────────────────────────────────────────

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY    = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

def upload_to_cloudinary(image_path: str, mime_type: str) -> str | None:
    """Upload a local image file to Cloudinary and return the secure_url."""
    if not all([CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET]):
        print("⚠️  Cloudinary credentials missing in .env")
        return None

    # Build signed upload (no unsigned preset required)
    timestamp = str(int(time.time()))
    params_to_sign = f"folder=medvault_diet&timestamp={timestamp}"
    signature = hmac.new(
        CLOUDINARY_API_SECRET.encode(),
        params_to_sign.encode(),
        hashlib.sha1
    ).hexdigest()

    upload_url = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/upload"

    with open(image_path, "rb") as f:
        response = http_requests.post(
            upload_url,
            files={"file": (os.path.basename(image_path), f, mime_type)},
            data={
                "api_key":   CLOUDINARY_API_KEY,
                "timestamp": timestamp,
                "signature": signature,
                "folder":    "medvault_diet",
            },
            timeout=60,
        )

    if response.status_code == 200:
        url = response.json().get("secure_url")
        print(f"☁️  Cloudinary upload OK: {url}")
        return url
    else:
        print(f"❌ Cloudinary upload failed: {response.status_code} — {response.text[:200]}")
        return None


def inject_image_from_url(cloudinary_url: str, mime_type: str) -> bool:
    """
    Use JavaScript inside the browser to fetch the Cloudinary image and
    inject it into the Gemini file input via DataTransfer — no OS dialog needed.
    Returns True on success.
    """
    js = f"""
    async () => {{
        try {{
            // Fetch image from Cloudinary inside the browser
            const resp = await fetch('{cloudinary_url}');
            if (!resp.ok) return false;
            const blob = await resp.blob();
            const file = new File([blob], 'meal_image.jpg', {{ type: '{mime_type}' }});

            const dt = new DataTransfer();
            dt.items.add(file);

            // Gemini has a hidden <input type="file"> in the DOM
            const inputs = document.querySelectorAll('input[type="file"]');
            const input = inputs[inputs.length - 1] || inputs[0];
            if (!input) return false;

            // Override the files property and fire change events
            Object.defineProperty(input, 'files', {{
                value: dt.files,
                configurable: true,
                writable: false,
            }});
            input.dispatchEvent(new Event('change', {{ bubbles: true }}));
            input.dispatchEvent(new Event('input',  {{ bubbles: true }}));
            return true;
        }} catch(e) {{
            console.error('inject_image_from_url error:', e);
            return false;
        }}
    }}
    """
    result = page.evaluate(js)
    print(f"🖼️  Image injected via DataTransfer: {result}")
    return bool(result)


# ─── Textbox detection ─────────────────────────────────────────────────────────

def find_textbox():
    """Auto-detect the input textbox — cached after first find so it's instant."""
    global cached_selector

    if cached_selector:
        try:
            if cached_selector[0] == 'role':
                el = page.get_by_role("textbox", name=cached_selector[1])
            else:
                el = page.locator(cached_selector[1]).last
            return el
        except:
            cached_selector = None

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


# ─── Browser init ──────────────────────────────────────────────────────────────

def init_page():
    global playwright, browser, page

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


# ─── Flask endpoints ───────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health_check():
    """Lightweight ping — does NOT trigger a Gemini query."""
    return jsonify({"status": "ok", "page_loaded": page is not None})


@app.route('/receive', methods=['POST'])
def receive_request():
    data = request.get_json(force=True)
    query = data.get("query")

    for attempt in range(2):  # retry once after reconnect
        with _playwright_lock:
            if attempt > 0 or not is_browser_alive():
                reconnect_browser()

            try:
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

            except Exception as e:
                err_msg = str(e).lower()
                if 'connection closed' in err_msg or 'target closed' in err_msg or 'browser has been closed' in err_msg:
                    print(f"⚠️  Browser connection lost (attempt {attempt+1}): {e}")
                    if attempt == 0:
                        continue  # retry after reconnect
                print(f"❌ Error in /receive: {e}")
                return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/img', methods=['POST'])
def receive_img():
    data          = request.get_json(force=True)
    query         = data.get("query")
    base64_image  = data.get("image")
    mime_type     = data.get("mime_type", "image/jpeg")

    if not base64_image:
        return jsonify({"status": "error", "message": "No file provided"}), 400

    # ── 1. Save base64 to a temp file ─────────────────────────────────────────
    ext        = MIME_EXTENSIONS.get(mime_type.lower(), ".bin")
    timestamp  = int(time.time() * 1000)
    image_path = os.path.join(UPLOAD_FOLDER, f"upload_{timestamp}{ext}")
    png_path   = None

    try:
        raw_b64   = base64_image.split(",")[1] if "," in base64_image else base64_image
        file_data = base64.b64decode(raw_b64)
        with open(image_path, "wb") as f:
            f.write(file_data)
        print(f"✅ File saved: {image_path} ({mime_type})")
    except Exception as e:
        return jsonify({"status": "error", "message": f"Failed to decode/save file: {str(e)}"}), 400

    is_image = mime_type.lower().startswith("image/")

    try:
        if is_image:
            # ── IMAGE PATH: clipboard paste ───────────────────────────────────
            png_path = os.path.join(UPLOAD_FOLDER, f"upload_{timestamp}_cb.png")
            try:
                with PILImage.open(image_path) as img:
                    if img.mode in ('RGBA', 'LA', 'P', 'PA'):
                        img = img.convert('RGB')
                    img.save(png_path, 'PNG')
                clipboard_path = os.path.abspath(png_path).replace("\\", "\\\\")
                print(f"🔄 Converted to PNG for clipboard: {png_path}")
            except Exception as conv_err:
                print(f"⚠️  PNG conversion failed ({conv_err}), using original")
                clipboard_path = os.path.abspath(image_path).replace("\\", "\\\\")

            for attempt in range(2):
                with _playwright_lock:
                    if attempt > 0 or not is_browser_alive():
                        reconnect_browser()

                    try:
                        textbox = find_textbox()
                        if textbox is None:
                            return jsonify({"status": "error", "message": "Could not find input box"}), 500

                        ps_cmd = (
                            "Add-Type -AssemblyName System.Windows.Forms; "
                            "Add-Type -AssemblyName System.Drawing; "
                            f"$img = [System.Drawing.Image]::FromFile('{clipboard_path}'); "
                            "[System.Windows.Forms.Clipboard]::SetImage($img); "
                            "$img.Dispose()"
                        )
                        ps_result = subprocess.run(
                            ["powershell", "-STA", "-Command", ps_cmd],
                            capture_output=True, text=True, timeout=15
                        )
                        if ps_result.returncode != 0:
                            print(f"⚠️  PowerShell clipboard error: {ps_result.stderr}")
                        else:
                            print("📋 Image copied to Windows clipboard")

                        time.sleep(0.5)
                        textbox.click()
                        time.sleep(0.3)
                        page.keyboard.press("Control+v")
                        time.sleep(2.5)

                        safe_query = query.replace('\n', ' ').replace('\r', ' ').strip()
                        page.keyboard.type(safe_query)
                        time.sleep(0.3)
                        page.keyboard.press("Enter")

                        page.wait_for_selector(
                            '.text-input-field >> xpath=preceding::span[contains(@class, "user-query-bubble-with-background")][1]/following::div[@data-test-lottie-animation-status="completed"][1]',
                            timeout=600000
                        )
                        locater = page.locator('xpath=(//div[contains(@class, "text-input-field")])[1]/preceding::message-content[1]')
                        locater.wait_for(timeout=600000)
                        response_text = locater.inner_text()
                        return jsonify({"status": "success", "response": response_text})

                    except Exception as e:
                        err_msg = str(e).lower()
                        if 'connection closed' in err_msg or 'target closed' in err_msg or 'browser has been closed' in err_msg:
                            print(f"⚠️  Browser connection lost in /img (attempt {attempt+1}): {e}")
                            if attempt == 0:
                                continue
                        print(f"❌ Error in /img: {e}")
                        return jsonify({"status": "error", "message": str(e)}), 500

        else:
            # ── PDF / NON-IMAGE PATH: DataTransfer file input injection ────────
            b64_for_js = base64.b64encode(file_data).decode()
            filename = f"document{ext}"
            print(f"📄 Using DataTransfer injection for {mime_type}")

            for attempt in range(2):
                with _playwright_lock:
                    if attempt > 0 or not is_browser_alive():
                        reconnect_browser()

                    try:
                        textbox = find_textbox()
                        if textbox is None:
                            return jsonify({"status": "error", "message": "Could not find input box"}), 500

                        inject_js = f"""
                        async () => {{
                            try {{
                                const b64 = '{b64_for_js}';
                                const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
                                const blob = new Blob([bytes], {{ type: '{mime_type}' }});
                                const file = new File([blob], '{filename}', {{ type: '{mime_type}' }});
                                const dt = new DataTransfer();
                                dt.items.add(file);
                                const inputs = document.querySelectorAll('input[type="file"]');
                                const input = inputs[inputs.length - 1] || inputs[0];
                                if (!input) return false;
                                Object.defineProperty(input, 'files', {{
                                    value: dt.files, configurable: true, writable: false,
                                }});
                                input.dispatchEvent(new Event('change', {{ bubbles: true }}));
                                input.dispatchEvent(new Event('input',  {{ bubbles: true }}));
                                return true;
                            }} catch(e) {{
                                console.error('file inject error:', e);
                                return false;
                            }}
                        }}
                        """
                        result = page.evaluate(inject_js)
                        print(f"📎 File injected via DataTransfer: {result}")

                        if not result:
                            return jsonify({"status": "error", "message": "Failed to inject file into Gemini"}), 500

                        time.sleep(3)

                        textbox.click()
                        time.sleep(0.3)
                        safe_query = query.replace('\n', ' ').replace('\r', ' ').strip()
                        page.keyboard.type(safe_query)
                        time.sleep(0.3)
                        page.keyboard.press("Enter")

                        page.wait_for_selector(
                            '.text-input-field >> xpath=preceding::span[contains(@class, "user-query-bubble-with-background")][1]/following::div[@data-test-lottie-animation-status="completed"][1]',
                            timeout=600000
                        )
                        locater = page.locator('xpath=(//div[contains(@class, "text-input-field")])[1]/preceding::message-content[1]')
                        locater.wait_for(timeout=600000)
                        response_text = locater.inner_text()
                        return jsonify({"status": "success", "response": response_text})

                    except Exception as e:
                        err_msg = str(e).lower()
                        if 'connection closed' in err_msg or 'target closed' in err_msg or 'browser has been closed' in err_msg:
                            print(f"⚠️  Browser connection lost in /img (attempt {attempt+1}): {e}")
                            if attempt == 0:
                                continue
                        print(f"❌ Error in /img: {e}")
                        return jsonify({"status": "error", "message": str(e)}), 500

    finally:
        for path in [image_path, png_path]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                    print(f"🗑️  Cleaned up: {path}")
                except Exception:
                    pass


@app.route('/audio', methods=['POST'])
def receive_audio():
    """
    Handle audio files (voice notes, mp3, ogg, webm, wav).
    Uses DataTransfer JS injection to attach to Gemini's <input type="file">
    instead of clipboard paste (which only works for images).
    """
    data      = request.get_json(force=True)
    query     = data.get("query", "Transcribe this audio message accurately.")
    b64_audio = data.get("audio")
    mime_type = data.get("mime_type", "audio/ogg")

    if not b64_audio:
        return jsonify({"status": "error", "message": "No audio provided"}), 400

    # 1. Save audio to temp file
    ext       = MIME_EXTENSIONS.get(mime_type.lower(), ".bin")
    timestamp = int(time.time() * 1000)
    audio_path = os.path.join(UPLOAD_FOLDER, f"audio_{timestamp}{ext}")

    try:
        raw_b64   = b64_audio.split(",")[1] if "," in b64_audio else b64_audio
        file_data = base64.b64decode(raw_b64)
        with open(audio_path, "wb") as f:
            f.write(file_data)
        print(f"✅ Audio saved: {audio_path} ({mime_type})")
    except Exception as e:
        return jsonify({"status": "error", "message": f"Failed to decode audio: {str(e)}"}), 400

    try:
        # 2. Upload to Cloudinary for a public URL that browser JS can fetch
        cloud_url = upload_to_cloudinary(audio_path, mime_type)
        if not cloud_url:
            # Fallback: serve from local file as data URI inside JS
            audio_b64_for_js = base64.b64encode(file_data).decode()
            cloud_url = None

        with _playwright_lock:
            textbox = find_textbox()
            if textbox is None:
                return jsonify({"status": "error", "message": "Could not find input box"}), 500

            # 3. Inject audio via DataTransfer into Gemini's file input
            if cloud_url:
                inject_js = f"""
                async () => {{
                    try {{
                        const resp = await fetch('{cloud_url}');
                        if (!resp.ok) return false;
                        const blob = await resp.blob();
                        const file = new File([blob], 'voice_note{ext}', {{ type: '{mime_type}' }});
                        const dt = new DataTransfer();
                        dt.items.add(file);
                        const inputs = document.querySelectorAll('input[type="file"]');
                        const input = inputs[inputs.length - 1] || inputs[0];
                        if (!input) return false;
                        Object.defineProperty(input, 'files', {{
                            value: dt.files, configurable: true, writable: false,
                        }});
                        input.dispatchEvent(new Event('change', {{ bubbles: true }}));
                        input.dispatchEvent(new Event('input',  {{ bubbles: true }}));
                        return true;
                    }} catch(e) {{
                        console.error('audio inject error:', e);
                        return false;
                    }}
                }}
                """
            else:
                # Inline base64 fallback
                inject_js = f"""
                async () => {{
                    try {{
                        const b64 = '{audio_b64_for_js}';
                        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
                        const blob = new Blob([bytes], {{ type: '{mime_type}' }});
                        const file = new File([blob], 'voice_note{ext}', {{ type: '{mime_type}' }});
                        const dt = new DataTransfer();
                        dt.items.add(file);
                        const inputs = document.querySelectorAll('input[type="file"]');
                        const input = inputs[inputs.length - 1] || inputs[0];
                        if (!input) return false;
                        Object.defineProperty(input, 'files', {{
                            value: dt.files, configurable: true, writable: false,
                        }});
                        input.dispatchEvent(new Event('change', {{ bubbles: true }}));
                        input.dispatchEvent(new Event('input',  {{ bubbles: true }}));
                        return true;
                    }} catch(e) {{
                        console.error('audio inject error:', e);
                        return false;
                    }}
                }}
                """

            result = page.evaluate(inject_js)
            print(f"🎤 Audio injected via DataTransfer: {result}")

            if not result:
                return jsonify({"status": "error", "message": "Failed to inject audio into Gemini"}), 500

            time.sleep(2.5)  # Wait for Gemini to process the attachment

            # 4. Type the prompt
            textbox.click()
            time.sleep(0.3)
            safe_query = query.replace('\n', ' ').replace('\r', ' ').strip()
            page.keyboard.type(safe_query)
            time.sleep(0.3)
            page.keyboard.press("Enter")

            # 5. Wait for response
            page.wait_for_selector(
                '.text-input-field >> xpath=preceding::span[contains(@class, "user-query-bubble-with-background")][1]/following::div[@data-test-lottie-animation-status="completed"][1]',
                timeout=600000
            )

            locater = page.locator('xpath=(//div[contains(@class, "text-input-field")])[1]/preceding::message-content[1]')
            locater.wait_for(timeout=600000)
            response_text = locater.inner_text()

        return jsonify({"status": "success", "response": response_text})

    except Exception as e:
        print(f"❌ Error in /audio: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

    finally:
        if os.path.exists(audio_path):
            try:
                os.remove(audio_path)
                print(f"🗑️  Cleaned up: {audio_path}")
            except Exception:
                pass


if __name__ == "__main__":
    init_page()
    # IMPORTANT: threaded=False — Playwright sync API is pinned to the main OS thread.
    app.run(host='0.0.0.0', port=5000, threaded=False)

