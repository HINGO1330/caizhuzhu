export function installInstructionsFor(userAgent = "") {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "在 Safari 点分享，再选“添加到主屏幕”。";
  if (/Android/i.test(userAgent)) return "在浏览器菜单中选择“安装应用”或“添加到主屏幕”。";
  return "在浏览器菜单中选择“安装”或“添加到主屏幕”。";
}
