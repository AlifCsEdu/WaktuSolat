import { describe, it, expect } from "vitest";
import {
  extractStateName,
  extractLocalityName,
  mapStateToZone,
  matchZoneFromGeocode,
  cleanText
} from "../src/lib/geocoding";

describe("Geocoding Service Helpers", () => {
  it("should parse state names correctly from Nominatim or BigDataCloud format", () => {
    const mockBdcData = {
      bdc: { principalSubdivision: "Selangor", city: "Shah Alam" }
    };
    const mockOsmData = {
      osm: { address: { state: "Perak", city: "Ipoh" } }
    };

    expect(extractStateName(mockBdcData)).toBe("Selangor");
    expect(extractStateName(mockOsmData)).toBe("Perak");
  });

  it("should extract locality names with correct priority", () => {
    const mockData = {
      bdc: { locality: "Subang Jaya", city: "Petaling" },
      osm: { address: { suburb: "Kelana Jaya" } }
    };
    expect(extractLocalityName(mockData)).toBe("Subang Jaya");
  });

  it("should clean text to remove standard stop tokens in Malaysia location names", () => {
    expect(cleanText("Mukim Kajang")).toBe("kajang");
    expect(cleanText("Kampung Gombak")).toBe("gombak");
  });

  it("should map standard states to defaults successfully", () => {
    expect(mapStateToZone("Johor")).toBe("JHR02");
    expect(mapStateToZone("Kuala Lumpur")).toBe("WLY01");
    expect(mapStateToZone("Kedah")).toBe("KDH01");
  });

  it("should match zones from geocode based on custom ALIASES first", () => {
    const mockData = {
      bdc: { locality: "Ampang" }
    };
    const match = matchZoneFromGeocode(mockData);
    expect(match.zone).toBe("SGR01"); // Ampang maps to Selangor (SGR01)
    expect(match.reasonKey).toBe("alias");
    expect(match.detailVal).toBe("Ampang");
  });
});
