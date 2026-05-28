const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'ZoneSelector.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Remove the local ALIASES definition
const beforeLength = content.length;
content = content.replace(/const ALIASES: Record<string, string> = \{[\s\S]+?\};\r?\n\r?\nexport function ZoneSelector/, 'export function ZoneSelector');
const afterAliasesLength = content.length;
console.log(`ALIASES replacement: shrank from ${beforeLength} to ${afterAliasesLength} bytes.`);

// 2. Replace the handleAutoDetect method
const newHandleAutoDetect = `const handleAutoDetect = () => {
    if ("geolocation" in navigator) {
      setIsDetecting(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserCoords({ lat: latitude, lng: longitude });
          try {
            const data = await fetchReverseGeocode(latitude, longitude);
            const match = matchZoneFromGeocode(data);
            
            let reasonFound = "";
            if (match.reasonKey === "alias" || match.reasonKey === "locality") {
              reasonFound = t(match.reasonKey === "alias" ? "reasonMatchingArea" : "reasonMatchingLocality").replace(
                match.reasonKey === "alias" ? "{area}" : "{locality}",
                match.detailVal
              );
            } else if (match.reasonKey === "state") {
              reasonFound = t("reasonStateCapital").replace("{state}", match.detailVal);
            } else {
              reasonFound = "Kuala Lumpur (Lalai)";
            }

            onZoneSelect(match.zone);
            setDetectReason(reasonFound);
            setTimeout(() => setDetectReason(null), 5000);
            setIsOpen(false);
          } catch (err) {
            analytics.logError(err, { context: "ZoneSelector_handleAutoDetect" });
            alert(t("failDetectLocation"));
          } finally {
            setIsDetecting(false);
          }
        },
        (geoError) => {
          analytics.logError(geoError, { context: "ZoneSelector_geolocation" });
          setIsDetecting(false);
          alert(t("failDetectLocation"));
        },
        { timeout: 5000 }
      );
    } else {
      alert(t("noSupportLocation"));
    }
  };

  // Find the label for the selected zone`;

content = content.replace(/const handleAutoDetect = \(\) => \{[\s\S]+?\r?\n\s*\/\/ Find the label for the selected zone/, newHandleAutoDetect);
const afterDetectLength = content.length;
console.log(`handleAutoDetect replacement: shrank to ${afterDetectLength} bytes.`);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('ZoneSelector.tsx refactored successfully!');
