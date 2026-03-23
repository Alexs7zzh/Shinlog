import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baselinePath = path.join(__dirname, "typography-baseline.json");
const shouldUpdateBaseline = process.env.UPDATE_TYPOGRAPHY_BASELINE === "1";
const baselineViewport = {
  width: 1440,
  height: 1200,
};

const trackedProperties = [
  "resolvedLang",
  "fontFamily",
  "fontSize",
  "lineHeight",
  "fontStyle",
  "fontWeight",
  "letterSpacing",
  "fontFeatureSettings",
];

const typographyChecks = [
  {
    name: "zh-header-site-title",
    url: "/de-abstraction-and-design/zh/",
    selector: ".site-title",
  },
  {
    name: "zh-header-nav",
    url: "/de-abstraction-and-design/zh/",
    selector: "nav",
  },
  {
    name: "zh-post-title",
    url: "/de-abstraction-and-design/zh/",
    selector: ".post h1",
  },
  {
    name: "zh-post-description",
    url: "/de-abstraction-and-design/zh/",
    selector: ".info .description",
  },
  {
    name: "zh-post-description-paragraph",
    url: "/de-abstraction-and-design/zh/",
    selector: ".info .description p.end-mark",
  },
  {
    name: "zh-post-description-halfwidth",
    url: "/de-abstraction-and-design/zh/",
    selector: ".info .description .halfwidth",
  },
  {
    name: "zh-post-body-list-item",
    url: "/de-abstraction-and-design/zh/",
    selector: ".post li",
  },
  {
    name: "home-series-heading",
    url: "/",
    selector: ".series h2",
  },
  {
    name: "home-post-date",
    url: "/",
    selector: ".postlist-date",
  },
  {
    name: "home-post-link",
    url: "/",
    selector: ".postlist-link",
  },
  {
    name: "interlude-index-title",
    url: "/interludes/",
    selector: ".interlude-index h2",
  },
  {
    name: "interlude-date",
    url: "/interludes/",
    selector: '[id="2020-03-21"] .interlude-date',
  },
  {
    name: "interlude-headnote",
    url: "/interludes/",
    selector: '[id="2020-03-21"] .interlude-headnote',
  },
  {
    name: "interlude-body-first-paragraph",
    url: "/interludes/",
    selector: '[id="2020-03-21"] > p',
  },
  {
    name: "interlude-footnote",
    url: "/interludes/",
    selector: '[id="2021-05-15"] .footnotes li',
  },
  {
    name: "en-post-date",
    url: "/intro/",
    selector: ".info time",
  },
  {
    name: "en-post-body-first-paragraph",
    url: "/intro/",
    selector: ".post > p",
  },
  {
    name: "en-post-footnote",
    url: "/intro/",
    selector: ".footnotes li",
  },
];

function loadBaseline() {
  if (!fs.existsSync(baselinePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(baselinePath, "utf8"));
}

function normalizeCheckResult(check, actual) {
  return {
    name: check.name,
    url: check.url,
    selector: check.selector,
    nth: check.nth ?? 0,
    textSample: actual.textSample,
    styles: Object.fromEntries(trackedProperties.map((property) => [property, actual[property]])),
  };
}

async function collectTypography(page, check) {
  const nth = check.nth ?? 0;
  const matches = page.locator(check.selector);
  const count = await matches.count();

  if (count <= nth) {
    throw new Error(
      `Missing selector ${check.selector} on ${check.url} (needed index ${nth}, found ${count})`,
    );
  }

  const locator = matches.nth(nth);

  return locator.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      resolvedLang: element.lang || element.closest("[lang]")?.lang || document.documentElement.lang,
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      lineHeight: computed.lineHeight,
      fontStyle: computed.fontStyle,
      fontWeight: computed.fontWeight,
      letterSpacing: computed.letterSpacing,
      fontFeatureSettings: computed.fontFeatureSettings,
      textSample: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120),
    };
  });
}

test("typography baseline", async ({ page }) => {
  const baseline = loadBaseline();
  const results = [];
  let currentUrl = null;

  for (const check of typographyChecks) {
    if (check.url !== currentUrl) {
      currentUrl = check.url;
      await page.goto(check.url, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
    }

    const actual = await collectTypography(page, check);
    results.push(normalizeCheckResult(check, actual));
  }

  if (shouldUpdateBaseline) {
    fs.writeFileSync(
      baselinePath,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          viewport: baselineViewport,
          checks: results,
        },
        null,
        2,
      )}\n`,
    );
    test.info().annotations.push({
      type: "baseline",
      description: `Updated ${path.relative(process.cwd(), baselinePath)}`,
    });
    return;
  }

  expect(baseline, `Missing typography baseline at ${baselinePath}`).not.toBeNull();

  const expectedByName = new Map(baseline.checks.map((check) => [check.name, check]));
  const drift = [];

  for (const result of results) {
    const expected = expectedByName.get(result.name);
    if (!expected) {
      drift.push(`Missing baseline entry for ${result.name}`);
      continue;
    }

    for (const property of trackedProperties) {
      if (result.styles[property] !== expected.styles[property]) {
        drift.push(
          [
            result.name,
            `  page: ${result.url}`,
            `  selector: ${result.selector}`,
            `  property: ${property}`,
            `  expected: ${expected.styles[property]}`,
            `  actual:   ${result.styles[property]}`,
            `  text: ${result.textSample}`,
          ].join("\n"),
        );
      }
    }
  }

  expect(drift, drift.join("\n\n")).toEqual([]);
});
