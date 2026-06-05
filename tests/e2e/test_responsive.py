import os
import sys
import json
from playwright.sync_api import sync_playwright

VIEWPORTS = {
    "big_tv": {"width": 1920, "height": 1080},
    "desktop": {"width": 1440, "height": 900},
    "tablet_landscape": {"width": 1024, "height": 768},
    "tablet_portrait": {"width": 768, "height": 1024},
    "phone": {"width": 375, "height": 812}
}

DEFAULT_SETTINGS = {
    "language": "ms",
    "timeFormat": "12h",
    "mazhab": "shafii",
    "notificationType": "in-app",
    "showTvShortcut": True,
    "tvModeEnabled": False,
    "themeDark": False,
    "themeColor": "#006c54",
    "visualStyle": "default",
    "themeShape": "rounded"
}

def capture_responsive():
    print("=== AlurWaktu Responsive Layout Testing ===")
    
    port = os.environ.get('PORT', '8085')
    base_url = f"http://127.0.0.1:{port}"
    
    screenshot_dir = os.path.join(os.path.dirname(__file__), "screenshots", "responsive")
    os.makedirs(screenshot_dir, exist_ok=True)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        for name, size in VIEWPORTS.items():
            print(f"Testing viewport '{name}' ({size['width']}x{size['height']})...")
            
            # --- 1. Dashboard View ---
            context = browser.new_context(viewport=size)
            page = context.new_page()
            
            # Seed LocalStorage before navigation
            page.add_init_script(f"""
                localStorage.setItem('waktu-solat-onboarding-completed', 'true');
                localStorage.setItem('waktu-solat-zone', 'SGR01');
                localStorage.setItem('theme_visual_style', 'glassmorphism');
                localStorage.setItem('theme_shape', 'rounded');
                localStorage.setItem('waktu-solat-settings', JSON.stringify({json.dumps(DEFAULT_SETTINGS)}));
            """)
            
            page.on("pageerror", lambda err: print(f"  [PAGE ERROR] {err}"))
            page.goto(base_url)
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1000)  # Wait for mount animations to complete
            
            # Capture Dashboard
            dashboard_path = os.path.join(screenshot_dir, f"dashboard_{name}.png")
            page.screenshot(path=dashboard_path)
            print(f"  [PASSED] Dashboard: {dashboard_path}")
            
            # --- 2. Settings Modal View ---
            print("  Opening Settings Modal...")
            try:
                # Find the settings icon button. It's inside PrayerSchedule and is a motion.div containing md-filled-tonal-icon-button
                # Let's locate the md-filled-tonal-icon-button or the lucide Settings icon
                settings_btn = page.locator('md-filled-tonal-icon-button:has(svg.lucide-settings)')
                if settings_btn.count() > 0:
                    settings_btn.first.click()
                    page.wait_for_timeout(1000)  # Wait for modal open animation
                    settings_path = os.path.join(screenshot_dir, f"settings_{name}.png")
                    page.screenshot(path=settings_path)
                    print(f"  [PASSED] Settings Modal: {settings_path}")
                else:
                    print("  [WARN] Settings button not found in page")
            except Exception as e:
                print(f"  [ERROR] Failed to open settings: {e}")
                
            context.close()
            
            # --- 3. TV Mode View ---
            # Reload context with TV Mode enabled in settings
            tv_settings = DEFAULT_SETTINGS.copy()
            tv_settings["tvModeEnabled"] = True
            
            context = browser.new_context(viewport=size)
            page = context.new_page()
            page.add_init_script(f"""
                localStorage.setItem('waktu-solat-onboarding-completed', 'true');
                localStorage.setItem('waktu-solat-zone', 'SGR01');
                localStorage.setItem('theme_visual_style', 'glassmorphism');
                localStorage.setItem('theme_shape', 'rounded');
                localStorage.setItem('waktu-solat-settings', JSON.stringify({json.dumps(tv_settings)}));
            """)
            
            page.goto(base_url)
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)  # Wait extra for TV mode slides/weather to settle
            
            tv_path = os.path.join(screenshot_dir, f"tv_mode_{name}.png")
            page.screenshot(path=tv_path)
            print(f"  [PASSED] TV Mode: {tv_path}")
            
            context.close()
            print("")
            
        browser.close()
        print("=== Responsive layout testing completed! ===")

if __name__ == "__main__":
    capture_responsive()
