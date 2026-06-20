const res = await fetch("https://cardata.wiki/");
const html = await res.text();

const slugs = [
  ...html.matchAll(/href="\/([a-z0-9-]+)"/g),
].map((m) => m[1]);

const skip = new Set([
  "api",
  "about",
  "privacy",
  "terms",
  "blog",
  "contact",
  "search",
  "makes",
  "login",
  "register",
  "pricing",
]);

const unique = [...new Set(slugs.filter((s) => !skip.has(s) && !s.includes(".")))];

console.log("Make count:", unique.length);
console.log(unique.join("\n"));
