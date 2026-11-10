import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { normalizeIncomingRequestUrl } from "../../src/server/normalizeIncomingRequestUrl";

const require = createRequire(import.meta.url);

test("normalizes absolute HTTP request targets to pathname and query", () => {
  const raw =
    "https://preview.example.com/api/media/64?variant=thumbnail&size=2";
  const request = { url: raw, originalUrl: raw };

  assert.equal(normalizeIncomingRequestUrl(request), true);
  assert.equal(request.url, "/api/media/64?variant=thumbnail&size=2");
  assert.equal(request.originalUrl, "/api/media/64?variant=thumbnail&size=2");
});

test("normalizes an absolute target without a path to the root path", () => {
  const request = { url: "http://preview.example.com?status=active" };

  assert.equal(normalizeIncomingRequestUrl(request), true);
  assert.equal(request.url, "/?status=active");
});

test("keeps origin-form request targets byte-for-byte unchanged", () => {
  const request = { url: "/api/supports?status=active" };

  assert.equal(normalizeIncomingRequestUrl(request), true);
  assert.equal(request.url, "/api/supports?status=active");
});

test("normalizes an absolute originalUrl even when it differs from url", () => {
  const request = {
    url: "/api/media/64",
    originalUrl: "https://preview.example.com/api/media/64?variant=thumbnail",
  };

  assert.equal(normalizeIncomingRequestUrl(request), true);
  assert.equal(request.url, "/api/media/64");
  assert.equal(request.originalUrl, "/api/media/64?variant=thumbnail");
});

test("rejects malformed, unsupported, credentialed and fragment-bearing absolute targets", () => {
  const malformed = { url: "https://[invalid/api/health" };
  const unsupported = { url: "ftp://preview.example.com/api/health" };
  const credentialed = {
    url: "https://user:pass@preview.example.com/api/health",
  };
  const fragment = { url: "https://preview.example.com/api/health#fragment" };

  for (const request of [malformed, unsupported, credentialed, fragment]) {
    const original = request.url;
    assert.equal(normalizeIncomingRequestUrl(request), false);
    assert.equal(request.url, original);
  }
});

test("rejects non-origin, non-HTTP request targets", () => {
  const request = { url: "*" };

  assert.equal(normalizeIncomingRequestUrl(request), false);
  assert.equal(request.url, "*");
});

test("clears Express URL parse caches when an absolute target is normalized", () => {
  const request = {
    url: "https://preview.example.com/api/health",
    originalUrl: "https://preview.example.com/api/health",
    _parsedUrl: { _raw: "https://preview.example.com/api/health" },
    _parsedOriginalUrl: { _raw: "https://preview.example.com/api/health" },
  };

  assert.equal(normalizeIncomingRequestUrl(request), true);
  assert.equal(request._parsedUrl, undefined);
  assert.equal(request._parsedOriginalUrl, undefined);
});

test("prevents Express parseurl from invoking the legacy url.parse fallback", () => {
  const urlModule = require("url") as { parse: (...args: any[]) => any };
  const originalParse = urlModule.parse;
  const parseurlPath = require.resolve("parseurl");
  delete require.cache[parseurlPath];

  let legacyParseCalls = 0;
  urlModule.parse = (...args: any[]) => {
    legacyParseCalls += 1;
    return originalParse(...args);
  };

  try {
    const parseurl = require("parseurl") as (request: {
      url?: string;
    }) => unknown;
    const request = {
      url: "https://preview.example.com/api/media/64?variant=thumbnail",
    };

    assert.equal(normalizeIncomingRequestUrl(request), true);
    parseurl(request);
    assert.equal(legacyParseCalls, 0);
  } finally {
    urlModule.parse = originalParse;
    delete require.cache[parseurlPath];
  }
});

test("is idempotent", () => {
  const request = { url: "https://preview.example.com/api/supports" };

  assert.equal(normalizeIncomingRequestUrl(request), true);
  assert.equal(normalizeIncomingRequestUrl(request), true);
  assert.equal(request.url, "/api/supports");
});


test("precomputes req.query with WHATWG URL before Express accesses Vercel's legacy getter", () => {
  const urlModule = require("url") as { parse: (...args: any[]) => any };
  const originalParse = urlModule.parse;
  const expressQuery = require("express/lib/middleware/query")();
  let legacyParseCalls = 0;

  urlModule.parse = (...args: any[]) => {
    legacyParseCalls += 1;
    return originalParse(...args);
  };

  const request = Object.create({
    get query() {
      return urlModule.parse(this.url, true).query;
    },
  });
  request.url = "/api/media/64?variant=thumbnail&tag=one&tag=two";

  try {
    assert.equal(normalizeIncomingRequestUrl(request), true);
    expressQuery(request, {}, () => undefined);
    assert.equal(legacyParseCalls, 0);
    assert.equal(request.query.variant, "thumbnail");
    assert.deepEqual(request.query.tag, ["one", "two"]);
  } finally {
    urlModule.parse = originalParse;
  }
});

test("precomputes an empty query object when the request has no query string", () => {
  const request = { url: "/api/health" };

  assert.equal(normalizeIncomingRequestUrl(request), true);
  assert.equal(Object.hasOwn(request, "query"), true);
  assert.deepEqual(Object.keys(request.query), []);
});
