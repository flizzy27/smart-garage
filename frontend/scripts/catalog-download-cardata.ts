#!/usr/bin/env tsx
import {
  downloadAllCardataCsvs,
  fetchCardataMakeSlugs,
} from "../lib/catalog/sources/cardata-wiki";

async function main() {
  console.log("Smart Garage — download all cardata.wiki CSVs\n");

  const slugs = await fetchCardataMakeSlugs();
  console.log(`Found ${slugs.length} makes\n`);

  const result = await downloadAllCardataCsvs(slugs, (message) => console.log(message));

  console.log(`\nDownloaded: ${result.downloaded}/${slugs.length}`);
  if (result.failed.length > 0) {
    console.log("Failed:", result.failed.join(", "));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
