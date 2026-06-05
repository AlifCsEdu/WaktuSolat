import { describe, it, expect } from "vitest";
import {
  extractStateName,
  extractLocalityName,
  mapStateToZone,
  matchZoneFromGeocode,
  cleanText
} from "../src/lib/geocoding";
import { JAKIM_ZONES } from "../src/lib/zones";

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

  it("should match Puncak Alam to SGR02", () => {
    const mockData = {
      osm: { address: { suburb: "Puncak Alam" } }
    };
    const match = matchZoneFromGeocode(mockData);
    expect(match.zone).toBe("SGR02");
    expect(match.reasonKey).toBe("alias");
    expect(match.detailVal).toBe("Puncak Alam");
  });

  it("should match county field directly to district map first", () => {
    const mockData = {
      osm: { address: { county: "Daerah Kuala Selangor" } }
    };
    const match = matchZoneFromGeocode(mockData);
    expect(match.zone).toBe("SGR02");
    expect(match.reasonKey).toBe("locality");
    expect(match.detailVal).toBe("Kuala Selangor");
  });

  it("should prioritize official county over border township alias", () => {
    const mockData = {
      osm: { 
        address: { 
          city: "Shah Alam", 
          county: "Daerah Kuala Selangor",
          suburb: "Puncak Alam"
        } 
      }
    };
    const match = matchZoneFromGeocode(mockData);
    // Since county is "Daerah Kuala Selangor", it matches SGR02,
    // even though city "Shah Alam" has alias SGR01
    expect(match.zone).toBe("SGR02");
    expect(match.reasonKey).toBe("locality");
    expect(match.detailVal).toBe("Kuala Selangor");
  });

  it("should match standard district names correctly", () => {
    const mockData1 = { osm: { address: { county: "Kulai" } } };
    expect(matchZoneFromGeocode(mockData1).zone).toBe("JHR02");

    const mockData2 = { osm: { address: { district: "Kinta" } } };
    // Kinta falls under PRK02 (which matches "Ipoh" or "Kampar")
    expect(matchZoneFromGeocode(mockData2).zone).toBe("PRK02");
  });

  it("should successfully match every single district in Malaysia to the correct JAKIM zone", () => {
    for (const state of JAKIM_ZONES) {
      for (const z of state.zones) {
        const parts = z.l
          .toLowerCase()
          .split(/[,()\/]/)
          .map((p) => p.replace(/\b(daerah|bahagian|jajahan|kecil|puncak|gunung|seluruh|negeri)\b/g, "").trim())
          .filter((p) => p.length > 2);
        for (const d of parts) {
          const cleaned = d.replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
          if (!cleaned) continue;

          // Test with county field
          const mockData = {
            osm: {
              address: {
                county: cleaned,
                state: state.state
              }
            }
          };

          const match = matchZoneFromGeocode(mockData);
          if (cleaned === "beluran" || cleaned.includes("sandakan") || cleaned.includes("tawau")) {
            expect(["SBH01", "SBH02", "SBH03", "SBH04"]).toContain(match.zone);
          } else {
            if (match.zone !== z.v) {
              console.log(`DEBUG FAILURE: cleaned="${cleaned}" expected="${z.v}" received="${match.zone}"`);
            }
            expect(match.zone).toBe(z.v);
          }
        }
      }
    }
  });
});
