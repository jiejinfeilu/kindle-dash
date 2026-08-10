// 在 GitHub Actions 上运行：定时抓取热榜并写入 data/feeds.json
// 页面只需要读取同源 JSON，彻底绕开浏览器跨域和代理问题。
const fs = require("fs");
const path = require("path");

const UP_UIDS = [
  { name: "极客湾Geekerwan", uid: "25876945" },
  { name: "谈三圈", uid: "520814591" },
  { name: "一网一匠", uid: "383814461" },
  { name: "FUN科技", uid: "9321359" }
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) { throw new Error("HTTP " + res.status + " " + url); }
  return await res.text();
}

async function getJson(url) {
  return JSON.parse(await get(url));
}

async function biliHot() {
  try {
    const d = await getJson("https://api.bilibili.com/x/web-interface/search/square?limit=10");
    const list = d.data && d.data.trending ? d.data.trending.list : [];
    return list.slice(0, 6).map(function (x) { return x.keyword; }).filter(Boolean);
  } catch (e) { return []; }
}

async function vvhanHot(endpoint) {
  try {
    const d = await getJson("https://api.vvhan.com/api/hotlist/" + endpoint);
    const list = d.data || [];
    return list.slice(0, 6).map(function (x) { return x.title; }).filter(Boolean);
  } catch (e) { return []; }
}

async function upDynamic(uid) {
  try {
    const txt = await get("https://rsshub.app/bilibili/user/dynamic/" + uid);
    const items = txt.split("<item>").slice(1).map(function (s) {
      const m = s.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
      return m ? m[1].replace(/&amp;/g, "&").replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
    }).filter(Boolean);
    return items.slice(0, 4);
  } catch (e) { return []; }
}

async function bingWallpaper() {
  try {
    const d = await getJson("https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1");
    const img = d.images && d.images[0];
    if (!img) { return ""; }
    const url = "https://www.bing.com" + img.url;
    const res = await fetch(url);
    if (!res.ok) { return ""; }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(path.join(__dirname, "..", "data", "wallpaper.jpg"), buf);
    return img.copyright || "";
  } catch (e) { return ""; }
}

async function main() {
  console.log("stage 1/3: fetching hotlists ...");
  const results = await Promise.all([
    biliHot(),
    vvhanHot("zhihuHot"),
    vvhanHot("wbHot")
  ]);
  console.log("stage 2/3: fetching wallpaper ...");
  const wallpaperCaption = await bingWallpaper();
  const ups = [];
  for (const u of UP_UIDS) {
    console.log("  up:", u.name);
    const titles = await upDynamic(u.uid);
    if (titles.length) { ups.push({ name: u.name, titles: titles }); }    如果 (titles.长度) { ups.推送({ 名称: u.名称, titles: titles }); }
  }
  const out = {  常量 输出 = {
    generated: new Date().toISOString(),    生成: 新的 日期().toISOString(),
    bili: results[0],    比里: 结果[0],
    zhihu: results[1],    知乎: 结果[1],
    weibo: results[2],    微博: 结果[2],
    ups: ups,
    wallpaperCaption: wallpaperCaption    壁纸标题: 壁纸标题
  };
  const dir = path.join(__dirname, "..", "data");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "feeds.json"), JSON.stringify(out, null, 2));
  console.log("stage 3/3: feeds.json + wallpaper.jpg written to", dir);
}

main().catch(function (e) { console.error(e); process.exit(1); });主().捕获(函数 (e) { 控制台.错误(e); 进程.退出(1); });
