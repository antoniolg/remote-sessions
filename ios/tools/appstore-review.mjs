// Sets the App Review contact (copied from another app of the account) and the review notes.
// Usage (from ios/): set -a; source tools/asc.env; set +a; node tools/appstore-review.mjs <app id to copy the contact from>
import { api } from "./asc-lib.mjs";

const APP_ID = "6821269160";
const contactFrom = process.argv[2];

const notes = `Remote Sessions is a companion app for Claude Code (Anthropic's coding agent). It connects to a small open-source server the user installs on their own computer (https://github.com/antoniolg/remote-sessions) and lists the Claude Code conversations stored there.

No account or login is needed. To review the app without a computer, tap "Try without a computer" on the welcome screen: it opens a demo with sample conversations. You can browse the list, open a conversation and read its messages. In the demo, "Connect" explains that a computer must be paired.

With a real computer, the user runs "brew install antoniolg/tap/remote-sessions && remote-sessions setup" (or the Linux/Windows script), scans the QR code it prints, and "Connect" resumes the conversation on the computer with Claude Code Remote Control and opens the returned claude.ai/code URL in the Claude app.

The app talks only to the user's own computer over HTTPS with a pinned self-signed certificate (local network or Tailscale). It collects no data. The camera is used only to scan the pairing QR code; local network access is used to reach and discover the user's computer.`;

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
