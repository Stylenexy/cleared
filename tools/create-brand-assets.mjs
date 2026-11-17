import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { readFile, writeFile } from "node:fs/promises";

const css = await readFile("web/app/globals.css", "utf8");
const token = (name) => {
  const value = css.match(new RegExp(`--${name}:\\s*(#[a-f0-9]{6})`, "i"))?.[1];
  if (!value) throw new Error(`Missing color token: ${name}`);
  return value;
};
const paths =
  '<path d="M35 9H18L7 20v17h17l17-17"/><path d="m17 24 7 7L41 14"/>';
await writeFile(
  "web/public/cleared-mark.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="${token("blue")}" stroke-width="4" stroke-linejoin="round"><title>Cleared</title>${paths}</svg>\n`,
);
await writeFile(
  "web/public/favicon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${token("background")}"/><g transform="translate(8 8)" fill="none" stroke="${token("blue")}" stroke-width="4" stroke-linejoin="round">${paths}</g></svg>\n`,
);

GlobalFonts.registerFromPath(
  "web/public/fonts/archivo-wide.woff2",
  "Cleared Display",
);
GlobalFonts.registerFromPath(
  "web/public/fonts/manrope-latin.woff2",
  "Cleared Body",
);
const canvas = createCanvas(1200, 630),
  ctx = canvas.getContext("2d");
ctx.fillStyle = token("background");
ctx.fillRect(0, 0, 1200, 630);
const glow = ctx.createRadialGradient(250, 0, 0, 250, 0, 750);
glow.addColorStop(0, token("glow"));
glow.addColorStop(1, token("background"));
ctx.fillStyle = glow;
ctx.fillRect(0, 0, 1200, 630);
function mark(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = token("blue");
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(35, 9);
  ctx.lineTo(18, 9);
  ctx.lineTo(7, 20);
  ctx.lineTo(7, 37);
  ctx.lineTo(24, 37);
  ctx.lineTo(41, 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(17, 24);
  ctx.lineTo(24, 31);
  ctx.lineTo(41, 14);
  ctx.stroke();
  ctx.restore();
}
mark(62, 48, 1.1);
ctx.fillStyle = token("ink");
ctx.font = '800 35px "Cleared Body"';
ctx.fillText("Cleared", 126, 90);
ctx.font = '800 64px "Cleared Display"';
ctx.fillText("Let your agent pay.", 64, 250);
ctx.fillText("Keep the last word.", 64, 335);
ctx.font = '400 23px "Cleared Body"';
ctx.fillStyle = token("muted");
ctx.fillText("A payee registry. A guarded vault. Built on Aevum.", 68, 404);
ctx.save();
ctx.translate(956, 466);
ctx.rotate(-0.12);
ctx.strokeStyle = token("red");
ctx.lineWidth = 3;
ctx.strokeRect(-147, -46, 294, 80);
ctx.fillStyle = token("red");
ctx.font = '800 44px "Cleared Display"';
ctx.textAlign = "center";
ctx.fillText("REFUSED", 0, 10);
ctx.restore();
ctx.font = '400 17px "Cleared Body"';
ctx.fillStyle = token("muted");
ctx.fillText("Invoice extraction meets contract-enforced payees.", 68, 565);
await writeFile("web/public/og.png", await canvas.encode("png"));
const icon = createCanvas(180, 180),
  iconCtx = icon.getContext("2d");
iconCtx.fillStyle = token("background");
iconCtx.fillRect(0, 0, 180, 180);
const svg = await readFile("web/public/cleared-mark.svg");
const { loadImage } = await import("@napi-rs/canvas");
iconCtx.drawImage(await loadImage(svg), 22, 22, 136, 136);
await writeFile("web/public/apple-touch-icon.png", await icon.encode("png"));
console.log("Generated Cleared mark, favicon, 1200×630 OG and touch icon.");
