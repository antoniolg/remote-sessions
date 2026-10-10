// Fills the App Store listing from store/metadata/*.json and store/ios/screenshots/<locale>/*.png.
// Idempotent: creates or updates localizations and replaces the screenshots of each locale.
// Usage (from ios/): set -a; source tools/asc.env; set +a; node tools/appstore-listing.mjs [--no-screenshots]
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { api, md5, uploadAsset } from "./asc-lib.mjs";

const APP_ID = "6821269160";
const STORE = new URL("../../store/", import.meta.url).pathname;
const LOCALES = ["en-US", "es-ES", "fr-FR", "de-DE", "it", "pt-BR", "ja", "ko", "zh-Hans", "zh-Hant", "ru", "nl-NL", "tr", "pl", "id"];
const SCREENSHOT_TYPE = "APP_IPHONE_67"; // 6.7"/6.9" iPhones (1320×2868)
const withScreenshots = !process.argv.includes("--no-screenshots");

const metadata = (locale) => JSON.parse(readFileSync(join(STORE, "metadata", `${locale}.json`), "utf8"));
const spanish = (locale) => locale.startsWith("es");
const projectUrl = (locale) => spanish(locale) ? "https://antonioleiva.com/proyectos/remote-sessions" : "https://antonioleiva.com/en/projects/remote-sessions";
const privacyUrl = (locale) => spanish(locale) ? "https://antonioleiva.com/remote-sessions/privacidad" : "https://antonioleiva.com/remote-sessions/privacy";

async function upsert(listPath, type, parent, locale, attributes) {
  const existing = (await api(`${listPath}?limit=200`)).data.find((item) => item.attributes.locale === locale);
  if (existing) {
    await api(`v1/${type}/${existing.id}`, "PATCH", { data: { type, id: existing.id, attributes } });
    return existing.id;
  }
  const created = await api(`v1/${type}`, "POST", { data: { type, attributes: { locale, ...attributes }, relationships: parent } });
  return created.data.id;
}

async function replaceScreenshots(versionLocalizationId, locale) {
  const dir = join(STORE, "ios", "screenshots", locale);
  const files = readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
  const sets = (await api(`v1/appStoreVersionLocalizations/${versionLocalizationId}/appScreenshotSets`)).data;
  let set = sets.find((s) => s.attributes.screenshotDisplayType === SCREENSHOT_TYPE);
  if (set) {
    for (const shot of (await api(`v1/appScreenshotSets/${set.id}/appScreenshots`)).data) {
      await api(`v1/appScreenshots/${shot.id}`, "DELETE");
    }
  } else {
    set = (await api("v1/appScreenshotSets", "POST", {
      data: {
        type: "appScreenshotSets",
        attributes: { screenshotDisplayType: SCREENSHOT_TYPE },
        relationships: { appStoreVersionLocalization: { data: { type: "appStoreVersionLocalizations", id: versionLocalizationId } } },
      },
    })).data;
  }
  for (const file of files) {
    const data = readFileSync(join(dir, file));
    const shot = (await api("v1/appScreenshots", "POST", {
      data: {
        type: "appScreenshots",
        attributes: { fileName: basename(file), fileSize: data.length },
        relationships: { appScreenshotSet: { data: { type: "appScreenshotSets", id: set.id } } },
      },
    })).data;
    await uploadAsset(shot.attributes.uploadOperations, data);
    await api(`v1/appScreenshots/${shot.id}`, "PATCH", {
      data: { type: "appScreenshots", id: shot.id, attributes: { uploaded: true, sourceFileChecksum: md5(data) } },
    });
  }
  return files.length;
}

// App info: categories and per-locale name, subtitle and privacy policy.
const appInfo = (await api(`v1/apps/${APP_ID}/appInfos`)).data.find((info) => info.attributes.appStoreState !== "READY_FOR_SALE")
  ?? (await api(`v1/apps/${APP_ID}/appInfos`)).data[0];
await api(`v1/appInfos/${appInfo.id}`, "PATCH", {
  data: {
    type: "appInfos", id: appInfo.id,
    relationships: {
      primaryCategory: { data: { type: "appCategories", id: "DEVELOPER_TOOLS" } },
      secondaryCategory: { data: { type: "appCategories", id: "PRODUCTIVITY" } },
    },
  },
});
console.log("categories: Developer Tools, Productivity");

const version = (await api(`v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&filter[appStoreState]=PREPARE_FOR_SUBMISSION`)).data[0];
if (!version) throw new Error("No iOS version in Prepare for Submission");
await api(`v1/appStoreVersions/${version.id}`, "PATCH", {
  data: { type: "appStoreVersions", id: version.id, attributes: { copyright: "2026 Antonio Leiva" } },
});

for (const locale of LOCALES) {
  const m = metadata(locale);
  await upsert(`v1/appInfos/${appInfo.id}/appInfoLocalizations`, "appInfoLocalizations",
    { appInfo: { data: { type: "appInfos", id: appInfo.id } } }, locale,
    { name: m.name, subtitle: m.subtitle, privacyPolicyUrl: privacyUrl(locale) });
  const versionLocalizationId = await upsert(`v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`, "appStoreVersionLocalizations",
    { appStoreVersion: { data: { type: "appStoreVersions", id: version.id } } }, locale,
    { description: m.description, keywords: m.keywords, promotionalText: m.promotionalText, supportUrl: projectUrl(locale), marketingUrl: projectUrl(locale) });
  const shots = withScreenshots ? await replaceScreenshots(versionLocalizationId, locale) : 0;
  console.log(`${locale}: listing ok${withScreenshots ? `, ${shots} screenshots` : ""}`);
}
