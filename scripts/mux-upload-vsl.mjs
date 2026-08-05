// One-off: upload the VSL to Mux and print its playback ID.
// Usage: node scripts/mux-upload-vsl.mjs <path-to-video>
import { createReadStream, statSync } from "node:fs";

import Mux from "@mux/mux-node";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/mux-upload-vsl.mjs <path-to-video>");
  process.exit(1);
}

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

const size = statSync(file).size;
console.log(`Uploading ${file} (${(size / 1024 / 1024).toFixed(1)} MB)`);

const upload = await mux.video.uploads.create({
  cors_origin: "*",
  new_asset_settings: {
    playback_policies: ["public"],
    video_quality: "plus",
  },
});

const res = await fetch(upload.url, {
  method: "PUT",
  headers: { "content-length": String(size) },
  body: createReadStream(file),
  duplex: "half",
});
if (!res.ok) {
  console.error("upload failed", res.status, await res.text());
  process.exit(1);
}
console.log("Uploaded. Waiting for Mux to create the asset...");

let assetId;
for (let i = 0; i < 60 && !assetId; i++) {
  await new Promise((r) => setTimeout(r, 3000));
  const u = await mux.video.uploads.retrieve(upload.id);
  assetId = u.asset_id;
  if (!assetId) process.stdout.write(".");
}
if (!assetId) {
  console.error("\ntimed out waiting for asset creation");
  process.exit(1);
}
console.log(`\nAsset created: ${assetId}. Waiting for it to be ready...`);

for (let i = 0; i < 120; i++) {
  const asset = await mux.video.assets.retrieve(assetId);
  if (asset.status === "ready") {
    const playbackId = asset.playback_ids?.[0]?.id;
    console.log("\nREADY");
    console.log("assetId:", assetId);
    console.log("playbackId:", playbackId);
    console.log("duration:", asset.duration);
    console.log("aspectRatio:", asset.aspect_ratio);
    process.exit(0);
  }
  if (asset.status === "errored") {
    console.error("\nasset errored", JSON.stringify(asset.errors));
    process.exit(1);
  }
  process.stdout.write(".");
  await new Promise((r) => setTimeout(r, 5000));
}
console.error("\ntimed out waiting for the asset to be ready");
process.exit(1);
