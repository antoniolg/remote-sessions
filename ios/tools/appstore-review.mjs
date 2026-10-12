// Sets the App Review contact (copied from another app of the account) and the review notes.
// Usage (from ios/): set -a; source tools/asc.env; set +a; node tools/appstore-review.mjs <app id to copy the contact from>
import { api } from "./asc-lib.mjs";

const APP_ID = "6821269160";
const contactFrom = process.argv[2];

const notes = `PURPOSE AND AUDIENCE
Remote Sessions is a free, open-source companion app for developers who use Claude Code, Anthropic's command-line coding agent, on their own computer. Claude Code conversations live on that computer, so developers lose sight of them when they step away. Remote Sessions lists those conversations on the phone, shows their latest messages, and with one tap resumes any of them (or starts a new one in a project folder) using Claude Code's official Remote Control feature, so the developer can keep working from the Claude app.

SETUP AND MAIN FEATURES
1) On a Mac, Linux or Windows computer with Claude Code installed, run "brew install antoniolg/tap/remote-sessions && remote-sessions setup" (or the Linux/Windows one-liner shown in the app). This installs a small open-source background server (https://github.com/antoniolg/remote-sessions) and prints a QR code.
2) In the app, tap "Get started" and scan that QR code.
3) The list of conversations appears. Tap one to read its recent messages, tap "Connect" to resume it in the Claude app, or tap "+" to start a new conversation in a folder of the computer.
No account or login is required. To try the app without a computer, tap "Try without a computer" on the welcome screen: it opens a demo with sample conversations (in the demo, "Connect" explains that a computer must be paired). A screen recording on a physical iPhone was sent in reply to App Review.

EXTERNAL SERVICES
The app talks only to the user's own computer over HTTPS (local network or Tailscale) with a certificate pinned at pairing. It has no backend, accounts, analytics, ads or AI services of its own. "Connect" opens a claude.ai/code session URL produced by Claude Code on the user's computer; Anthropic's Claude app (or the browser) handles it under the user's own Claude subscription.

REGIONAL DIFFERENCES
None. The app works the same in all regions and is localized into 15 languages.

REGULATED INDUSTRIES
Not applicable: no payments, health, financial or other regulated data, and no third-party protected material. Claude and Claude Code are trademarks of Anthropic; the app is an independent, unofficial client of the user's own installation and says so in its description.

PERMISSIONS
The camera is used only to scan the pairing QR code; local network access is used to reach and discover the user's computer. The app collects no data.`;

const source = (await api(`v1/apps/${contactFrom}/appStoreVersions?limit=1`)).data[0];
const contact = (await api(`v1/appStoreVersions/${source.id}/appStoreReviewDetail`)).data.attributes;
const version = (await api(`v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS`)).data[0];
const attributes = {
  contactFirstName: contact.contactFirstName, contactLastName: contact.contactLastName,
  contactEmail: contact.contactEmail, contactPhone: contact.contactPhone,
  demoAccountRequired: false, notes,
};
const existing = await api(`v1/appStoreVersions/${version.id}/appStoreReviewDetail`).catch(() => null);
if (existing?.data) {
  await api(`v1/appStoreReviewDetails/${existing.data.id}`, "PATCH", { data: { type: "appStoreReviewDetails", id: existing.data.id, attributes } });
} else {
  await api("v1/appStoreReviewDetails", "POST", {
    data: { type: "appStoreReviewDetails", attributes, relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: version.id } } } },
  });
}
console.log(`review details: ${contact.contactFirstName} ${contact.contactLastName} <${contact.contactEmail}>`);
