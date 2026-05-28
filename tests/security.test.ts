import { describe, it, expect } from "vitest";
import { sanitizeInput } from "../src/lib/security";

describe("Input Sanitizer Utility", () => {
  it("should return an empty string for null, undefined, or empty values", () => {
    expect(sanitizeInput("")).toBe("");
    expect(sanitizeInput(null as any)).toBe("");
    expect(sanitizeInput(undefined as any)).toBe("");
  });

  it("should strip out standard HTML tags", () => {
    expect(sanitizeInput("<script>alert('xss')</script>")).toBe("alert(&#x27;xss&#x27;)");
    expect(sanitizeInput("<div>Hello <b>World</b></div>")).toBe("Hello World");
  });

  it("should escape special characters to safe HTML entities", () => {
    expect(sanitizeInput("hello & world")).toBe("hello &amp; world");
    expect(sanitizeInput('click "here"')).toBe("click &quot;here&quot;");
    expect(sanitizeInput("john's book")).toBe("john&#x27;s book");
    expect(sanitizeInput("a/b")).toBe("a&#x2F;b");
  });

  it("should remove dangerous javascript: execution protocols", () => {
    expect(sanitizeInput("javascript:alert(1)")).toBe("alert(1)");
    expect(sanitizeInput("JAVASCRIPT:alert(1)")).toBe("alert(1)");
  });

  it("should remove dangerous event handlers like onload and onerror", () => {
    expect(sanitizeInput("<img src=x onerror=alert(1)>")).toBe("");
  });
});
