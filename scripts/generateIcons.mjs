// Rasterises src/app/icon.svg into the icon files browsers and search engines
// actually ask for. Run after changing the SVG:
//
//   node scripts/generateIcons.mjs
//
// Why these files exist at all, given Next.js already serves icon.svg:
//
//   - favicon.ico — Google's favicon crawler wants a conventional icon and
//     falls back to /favicon.ico; without one, search results show the
//     generic globe rather than the logo. Plenty of feed readers, chat
//     unfurlers and older browsers only look there too.
//   - apple-icon.png — iOS uses this when a visitor adds the site to their
//     home screen. Absent, it screenshots the page instead.
//
// The ICO is written by hand rather than with a library: the container is a
// 6-byte header plus one 16-byte entry per size, and every size can hold a
// PNG verbatim, so a dependency would buy nothing.
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const SVG = "src/app/icon.svg";
// 48 is the size Google renders search-result favicons at; 16 and 32 are the
// browser tab and bookmark bar.
const ICO_SIZES = [16, 32, 48];
const APPLE_SIZE = 180;

// A high density matters: the mark is 259 fine paths, and rasterising at the
// target size directly loses the spokes to aliasing.
async function png(size, svg = SVG) {
  const input = typeof svg === "string" && svg.startsWith("<") ? Buffer.from(svg) : svg;
  return sharp(input, { density: 600 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
}

/**
 * The icon.svg flips its fill with prefers-color-scheme, which a raster
 * cannot do. Each raster therefore has to commit to one variant, and they
 * commit differently:
 *
 *  - The ICO keeps the transparent background and the dark mark. Google draws
 *    search-result favicons on a light chip, and a browser falling back to
 *    the ICO is showing it in default (light) tab chrome.
 *  - apple-icon.png gets the black tile and the white mark. iOS composites a
 *    transparent home-screen icon onto black anyway, and Apple's own guidance
 *    is that app icons are opaque — so this is the one place the tile belongs.
 */
function darkTileVariant() {
  const svg = readFileSync(SVG, "utf8");
  const opening = svg.match(/<svg[^>]*>/)[0];
  const viewBox = opening.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const [x, y, w, h] = viewBox;
  const withTile = svg.replace(
    opening,
    `${opening}\n<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#000000"/>`
  );
  // Appended last, not injected after the opening tag: the SVG already carries
  // a `path { fill: #111111 }` rule, and between two rules of equal
  // specificity the later one wins. Inserted first, this override lost and the
  // mark came out dark on a black tile.
  return withTile.replace("</svg>", `<style>path { fill: #ffffff; }</style>\n</svg>`);
}

function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;

  images.forEach(({ size, data }, i) => {
    const at = i * 16;
    // 0 means 256 in this field; none of our sizes reach it.
    directory.writeUInt8(size, at);
    directory.writeUInt8(size, at + 1);
    directory.writeUInt8(0, at + 2); // palette size, 0 for truecolour
    directory.writeUInt8(0, at + 3); // reserved
    directory.writeUInt16LE(1, at + 4); // colour planes
    directory.writeUInt16LE(32, at + 6); // bits per pixel
    directory.writeUInt32LE(data.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });

  return Buffer.concat([header, directory, ...images.map((i) => i.data)]);
}

const images = [];
for (const size of ICO_SIZES) {
  images.push({ size, data: await png(size) });
}
writeFileSync("src/app/favicon.ico", buildIco(images));
console.log(
  `src/app/favicon.ico  ${ICO_SIZES.join("/")}px, ${(
    images.reduce((n, i) => n + i.data.length, 0) / 1024
  ).toFixed(1)} KB`
);

const apple = await png(APPLE_SIZE, darkTileVariant());
writeFileSync("src/app/apple-icon.png", apple);
console.log(`src/app/apple-icon.png  ${APPLE_SIZE}px, ${(apple.length / 1024).toFixed(1)} KB`);
