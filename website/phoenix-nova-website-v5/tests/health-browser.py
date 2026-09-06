"""Synthetic headless browser integration. Not iOS/Android/WeChat device acceptance."""
import json
import os
from pathlib import Path
import subprocess
import time
from urllib.request import urlopen
from playwright.sync_api import sync_playwright, expect

out = Path(os.environ.get("HEALTH_EVIDENCE_DIR", "health-evidence"))
out.mkdir(exist_ok=True)
checks = []
origin = "http://127.0.0.1:4387"

def passed(name):
    checks.append({"name": name, "status": "PASS"})

def fit(page, label):
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), label
    header = page.locator("header.site-header").bounding_box()
    content = page.locator("[data-health-compass]").bounding_box()
    assert content["y"] >= header["y"] + header["height"] - 1, "Header overlaps Health content"
    brand = page.locator("header .brand-mark").bounding_box()
    nav = page.locator("header nav").bounding_box()
    assert (brand["x"] + brand["width"] <= nav["x"] + 1 or brand["y"] + brand["height"] <= nav["y"] + 1), "Logo overlaps navigation"
    passed(label)

def start(page):
    expect(page.get_by_test_id("health-start")).to_be_disabled()
    page.get_by_test_id("health-consent").check()
    page.get_by_test_id("health-start").click()
    expect(page.locator("[data-step=questions]")).to_be_visible()

def finish(page):
    for _ in range(14):
        page.locator('input[type=radio]').first.check()
        page.get_by_test_id("health-next").click()
    page.get_by_test_id("health-result").click()
    expect(page.get_by_test_id("health-dimension")).to_have_count(6)

log = (out / "preview-server.log").open("w")
server = subprocess.Popen(["node", "scripts/health-preview-server.mjs"], env={**os.environ, "HEALTH_COMPASS_PREVIEW": "1"}, stdout=log, stderr=log)
try:
    for _ in range(60):
        try:
            with urlopen(origin + "/zh/compass/health", timeout=1) as response:
                if response.status == 200:
                    break
        except Exception:
            time.sleep(0.5)
    else:
        raise RuntimeError("Built worker preview did not start")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 1000}, accept_downloads=True)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(origin + "/zh", wait_until="networkidle")
        page.get_by_test_id("health-entry").click()
        page.wait_for_url("**/zh/compass/health")
        page.wait_for_load_state("networkidle")
        passed("Homepage entry opens the native Health route")
        page.screenshot(path=str(out / "health-desktop.jpg"), type="jpeg", quality=72, full_page=True)
        network = []
        page.on("request", lambda request: network.append(request.url))
        start(page)
        page.locator('input[type=radio]').first.check()
        page.get_by_test_id("health-next").click()
        page.get_by_test_id("health-back").click()
        expect(page.locator('input[type=radio]').first).to_be_checked()
        passed("Back preserves the prior choice")
        finish(page)
        passed("14 questions to review and six-dimension result")
        for dimension in ["follow", "care", "access", "cover"]:
            page.get_by_test_id("health-action-" + dimension).click()
        expect(page.locator('button[aria-pressed=true]')).to_have_count(3)
        expect(page.get_by_test_id("health-action-cover")).to_have_attribute("aria-pressed", "false")
        passed("Action choices cap at three without arbitrary replacement")
        with page.expect_download() as info:
            page.get_by_test_id("health-export").click()
        destination = out / "synthetic-action-list.txt"
        info.value.save_as(destination)
        content = destination.read_text(encoding="utf-8-sig")
        assert "1. 持续跟进" in content and "2. 家庭照护协作" in content
        assert "HC03" not in content and "全家一起" not in content
        passed("Downloaded action list preserves choice order and excludes raw answers")
        page.evaluate("() => { URL.createObjectURL = () => { throw new Error('Synthetic unsupported download'); }; }")
        page.get_by_test_id("health-export").click()
        expect(page.get_by_test_id("health-plan")).to_be_visible()
        expect(page.get_by_role("status")).to_contain_text("当前浏览器无法导出")
        passed("Unsupported download exposes copyable fallback without claiming success")
        for width in [320, 375, 390, 768, 1440]:
            page.set_viewport_size({"width": width, "height": 900})
            fit(page, f"Result layout has no horizontal overflow at {width}px")
        page.set_viewport_size({"width": 390, "height": 844})
        page.screenshot(path=str(out / "health-result-mobile.jpg"), type="jpeg", quality=72, full_page=True)
        assert not [url for url in network if not url.startswith("blob:")], network
        assert page.evaluate("localStorage.length === 0 && sessionStorage.length === 0 && document.cookie === ''")
        assert context.cookies() == []
        passed("Answering, reviewing, selecting and exporting make no network requests or browser-store writes")
        page.get_by_test_id("health-review").click()
        page.get_by_test_id("health-edit-2").click()
        page.locator('input[value=unknown]').check()
        page.get_by_test_id("health-next").click()
        page.get_by_test_id("health-result").click()
        expect(page.get_by_test_id("health-dimension").first).to_contain_text("你有待了解的事项")
        expect(page.locator('button[aria-pressed=true]')).to_have_count(0)
        passed("Review edit recomputes the result and clears stale action choices")
        page.reload(wait_until="networkidle")
        expect(page.locator("[data-step=intro]")).to_be_visible()
        expect(page.get_by_test_id("health-consent")).not_to_be_checked()
        passed("Real route refresh starts a fresh session")
        start(page)
        for _ in range(14):
            page.get_by_test_id("health-skip").click()
        page.get_by_test_id("health-result").click()
        expect(page.get_by_test_id("health-empty")).to_be_visible()
        expect(page.get_by_test_id("health-dimension")).to_have_count(0)
        passed("All-skipped journey does not fabricate personalised output")
        page.get_by_test_id("health-clear").click()
        page.get_by_test_id("health-confirm-clear").click()
        expect(page.locator("[data-step=intro]")).to_be_visible()
        passed("Confirmed clear resets the full flow")
        for width in [320, 375, 390, 768, 1440]:
            page.set_viewport_size({"width": width, "height": 900})
            page.goto(origin + "/zh/compass/health", wait_until="networkidle")
            fit(page, f"Intro fits at {width}px")
            start(page)
            fit(page, f"Question fits at {width}px")
        page.goto(origin + "/en/compass/health", wait_until="networkidle")
        expect(page.locator("h1")).to_contain_text("Bring your family's")
        start(page)
        expect(page.locator("h1")).to_contain_text("Whose arrangements")
        passed("English route hydrates and displays translated question content")
        assert errors == [], errors
        passed("No uncaught browser JavaScript errors")
        browser.close()
except Exception as error:
    try:
        page.screenshot(path=str(out / "failure.jpg"), type="jpeg", quality=72, full_page=True)
    except Exception:
        pass
    checks.append({"name": "Browser integration", "status": "FAIL", "error": str(error)})
    raise
finally:
    server.terminate()
    try:
        server.wait(timeout=10)
    except subprocess.TimeoutExpired:
        server.kill()
    log.close()
    (out / "browser-results.json").write_text(json.dumps({"code_sha": os.environ.get("HEALTH_TEST_SHA", "unknown"), "scope": "headless Chromium, synthetic inputs, built worker on loopback; not real mobile or WeChat", "checks": checks}, ensure_ascii=False, indent=2))
