const luminance = (h) => {
  const c = h
    .match(/\w\w/g)
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
};
const { readFile } = await import("node:fs/promises");
const css = await readFile("web/app/globals.css", "utf8");
const token = (name) => {
  const value = css.match(new RegExp(`--${name}:\\s*#([a-f0-9]{6})`, "i"))?.[1];
  if (!value) throw new Error("Missing token: " + name);
  return value;
};
const pairs = [
  ["ink", "background"],
  ["muted", "background"],
  ["ink", "surface"],
  ["muted", "surface"],
  ["muted", "surface-raised"],
  ["ink", "action"],
  ["ink", "action-hover"],
  ["safe", "safe-soft"],
  ["red", "red-soft"],
  ["hold", "hold-soft"],
  ["document-ink", "document"],
  ["document-muted", "document"],
  ["document-red", "document"],
  ["safe", "surface-raised"],
  ["red", "surface-raised"],
  ["document-muted", "document-well"],
  ["91a8c5", "background"],
];
for (const [foreground, background] of pairs) {
  const name = `${foreground}/${background}`;
  const a = /^[a-f0-9]{6}$/.test(foreground) ? foreground : token(foreground);
  const b = /^[a-f0-9]{6}$/.test(background) ? background : token(background);
  const x = luminance(a),
    y = luminance(b),
    ratio = (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  console.log(name, ratio.toFixed(2) + ":1");
  if (ratio < 4.5) process.exitCode = 1;
}
for (const [foreground, background] of [
  ["control-line", "well"],
  ["control-line", "surface-raised"],
  ["focus", "surface-raised"],
  ["focus", "action"],
]) {
  const x = luminance(token(foreground)),
    y = luminance(token(background));
  const ratio = (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  console.log(
    `${foreground}/${background} (non-text)`,
    ratio.toFixed(2) + ":1",
  );
  if (ratio < 3) process.exitCode = 1;
}
