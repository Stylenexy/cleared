const luminance = (h) => {
  const c = h
    .match(/\w\w/g)
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
};
const pairs = [
  ["ink/paper", "172b24", "f5f1e6"],
  ["muted/paper", "53665d", "f5f1e6"],
  ["button", "fffdf7", "173f32"],
  ["safe", "173f32", "e1ebe0"],
  ["danger", "a32626", "fbe8e5"],
  ["focus/paper", "8a4e16", "f5f1e6"],
];
for (const [name, a, b] of pairs) {
  const x = luminance(a),
    y = luminance(b),
    ratio = (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  console.log(name, ratio.toFixed(2) + ":1");
  if (ratio < 4.5) process.exitCode = 1;
}
