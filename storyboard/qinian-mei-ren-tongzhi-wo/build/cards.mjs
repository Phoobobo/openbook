import { writeFileSync, mkdirSync } from "node:fs";
// 720x1280 内容,作 1280x1280 方形 SVG(qlmanage 1:1 渲染),后 sips 裁中间 720 宽
const INK = "#ece9e3", GOLD = "#c9a96a", DIM = "#9b978f";
const SERIF = "Songti SC, Noto Serif SC, serif";
const esc = s => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

function card(name, lines) {
  const body = lines.map(l =>
    `  <text x="640" y="${l.y}" text-anchor="middle" font-family="${SERIF}" font-size="${l.size}" fill="${l.fill}"${l.weight?` font-weight="${l.weight}"`:""}${l.spacing?` letter-spacing="${l.spacing}"`:""}>${esc(l.t)}</text>`
  ).join("\n");
  writeFileSync(`cards/${name}.svg`,
`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="1280" viewBox="0 0 1280 1280">
  <rect width="1280" height="1280" fill="#000000"/>
${body}
</svg>`);
}
mkdirSync("cards", { recursive: true });

card("c1", [{ t:"七年没见。", y:905, size:46, fill:INK }]);
card("c2", [
  { t:"她把这个人养在身体里七年，", y:575, size:42, fill:INK },
  { t:"像养一道没结痂的口子。",     y:665, size:42, fill:INK }]);
card("c3", [
  { t:"重逢那天，她伸手去摸", y:575, size:42, fill:INK },
  { t:"供了七年的票根——",   y:665, size:42, fill:INK }]);
card("c4", [{ t:"是空的。", y:670, size:92, fill:GOLD, weight:600 }]);
card("c5", [{ t:"她没在疼。", y:895, size:64, fill:GOLD, weight:600 }]);
card("c6", [
  { t:"那道口子不知道什么时候，", y:575, size:42, fill:INK },
  { t:"安安静静地长好了。",       y:665, size:42, fill:INK }]);
card("c7a", [{ t:"“我迟到了。”", y:875, size:58, fill:INK, weight:600 }]);
card("c7b", [{ t:"不是逃。是真的，没什么可留的了。", y:960, size:30, fill:DIM }]);
card("c8", [
  { t:"她痊愈了很久了，",       y:575, size:44, fill:INK },
  { t:"只是一直，没有人通知她。", y:665, size:44, fill:GOLD }]);
card("c9", [
  { t:"七年没人通知我", y:540, size:72, fill:INK, weight:600, spacing:4 },
  { t:"OPENBOOK",       y:665, size:34, fill:GOLD, spacing:14 },
  { t:"完整版 2400 字 + 雨声 BGM 在主页", y:745, size:26, fill:DIM }]);
console.log("cards ok");
