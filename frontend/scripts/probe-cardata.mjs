const makes = ["volkswagen", "audi", "porsche", "skoda"];

for (const make of makes) {
  const res = await fetch(`https://cardata.wiki/${make}`);
  const html = await res.text();
  const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  const csvLinks = links.filter((l) => /csv|export|download/i.test(l));
  const modelLinks = links.filter((l) => l.startsWith(`/${make}/`) || l.match(new RegExp(`^/${make}-`, "i")));
  console.log(`\n=== ${make.toUpperCase()} (${res.status}) ===`);
  console.log("csv/export:", csvLinks.slice(0, 10).join("\n  ") || "none");
  console.log("models sample:", modelLinks.slice(0, 8).join("\n  "));
  const csvBtn = html.match(/export[^"']*csv[^"']*/gi)?.slice(0, 5);
  console.log("csv mentions:", csvBtn?.join(" | ") ?? "none");
}
