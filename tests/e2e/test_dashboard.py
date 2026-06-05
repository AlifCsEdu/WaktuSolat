import sys
import os
from playwright.sync_api import sync_playwright

def run_test():
    print("=== AlurWaktu E2E Playwright Test ===")
    
    # Read port from environment (passed by with_server.py)
    port = os.environ.get('PORT', '8085')
    url = f"http://127.0.0.1:{port}"
    
    print(f"Server Target: {url}")
    
    with sync_playwright() as p:
        print("Launching Chromium headless browser...")
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print(f"Navigating to {url}...")
        page.goto(url)
        
        print("Waiting for page load and network idle (HMR / APIs loaded)...")
        page.wait_for_load_state("networkidle")
        
        # Verify page title
        title = page.title()
        print(f"OK: Page Title: '{title}'")
        
        # Ensure screenshot output directory exists
        screenshot_dir = os.path.join(os.path.dirname(__file__), "screenshots")
        os.makedirs(screenshot_dir, exist_ok=True)
        screenshot_path = os.path.join(screenshot_dir, "dashboard_view.png")
        
        print(f"Capturing dashboard screenshot to: {screenshot_path}")
        page.screenshot(path=screenshot_path, full_page=True)
        
        # Reconnaissance checks
        content = page.content()
        has_setup_wizard = "Setup" in content or "Onboarding" in content or "Pilih" in content
        print(f"OK: Setup Wizard Visible (first-time launch): {has_setup_wizard}")
        
        browser.close()
        print("=== E2E Test Completed Successfully ===")

if __name__ == "__main__":
    run_test()
