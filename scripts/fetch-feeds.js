// 在 GitHub Actions 上运行：定时抓取热榜并写入 data/feeds.json
// 每个栏目配了多个数据源，按顺序自动切换，日志会打印每个源的成败。
const fs = require("fs");
const path = require("path");

const UP_UIDS = [
  { name: "极客湾Geekerwan", uid: "25876945" },
  { name: "谈三圈", uid: "520814591" },
  { name: "一网一匠", uid: "383814461" },
  { name: "FUN科技", uid: "9321359" }
];

const RSSHUBS = [
  "https://rsshub.app",
  "https://rsshub.rssforever.com",
  "https://rsshub.pseudoyu.com"
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

async function get(url, extraHeaders) {
  const headers = { "User-Agent": UA };
  if (extraHeaders) {
    for (const k in extraHeaders) { headers[k] = extraHeaders[k]; }
  }
  const res = await fetch(url, { headers: headers });
  if (!res.ok) { throw new Error("HTTP " + res.status + " " + url); }
  return await res.text();
}

async function getJson(url, extraHeaders) {
  return JSON.parse(await get(url, extraHeaders));
}

function pick(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length && out.length < n; i++) {
    const t = arr[i];
    if (t) { out.push(t); }
  }
  return out;
}

async function trySources(sources, n) {
  for (const s of sources) {
    try {
      const d = await getJson(s.url);
      const titles = pick(s.pick(d), n).map(function (x) { return s.title(x); }).filter(Boolean);
      if (titles.length) { console.log("  ok:", s.url); return titles; }
      console.log("  empty:", s.url);
    } catch (e) { console.log("  fail:", s.url, e.message); }
  }
  return [];
}

async function biliHot() {
  return trySources([
    {
      url: "https://api.bilibili.com/x/web-interface/search/square?limit=10",
      pick: function (d) { return (d.data && d.data.trending) ? d.data.trending.list : []; },
      title: function (x) { return x.keyword; }
    }
  ], 6);
}

async function zhihuHot() {
  return trySources([
    {
      url: "https://tenapi.cn/v2/zhihuhot",
      pick: function (d) { return d.data || []; },
      title: function (x) { return x.title; }
    },
    {
      url: "https://api.vvhan.com/api/hotlist/zhihuHot",
      pick: function (d) { return d.data || []; },
      title: function (x) { return x.title; }
    },
    {
      url: "https://api-hot.imsyy.top/zhihu",
      pick: function (d) { return d.data || []; },
      title: function (x) { return x.title; }
    },
    {
      url: "https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=10",
      pick: function (d) { return d.data || []; },
      title: function (x) { return x.target ? x.target.title : ""; }
    }
  ], 6);
}

async function weiboHot() {
  return trySources([
    {
      url: "https://tenapi.cn/v2/weibohot",
      pick: function (d) { return d.data || []; },
      title: function (x) { return x.title; }
    },
    {
      url: "https://weibo.com/ajax/side/hotSearch",
      pick: function (d) { return (d.data && d.data.realtime) ? d.data.realtime : []; },
      title: function (x) { return x.word; }
    },
    {
      url: "https://api.vvhan.com/api/hotlist/wbHot",
      pick: function (d) { return d.data || []; },
      title: function (x) { return x.title; }
    },
    {
      url: "https://api-hot.imsyy.top/weibo",
      pick: function (d) { return d.data || []; },
      title: function (x) { return x.title; }
    },
  ], 6);
}

function parseRssTitles(txt, n) {
  const items = txt.split("<item>").slice(1);
  const out = [];
  for (const s of items) {
    if (out.length >= n) { break; }
    const m = s.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
    if (m && m[1]) {
      const t = m[1].replace(/&amp;/g, "&").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
      if (t) { out.push(t); }
    }
  }
  return out;
}

async function upVideos(uid) {
  // 优先用 B站官方接口直接抓UP主最新投稿
  const apiUrls = [
    "https://api.bilibili.com/x/space/arc/search?mid=" + uid + "&ps=6&pn=1&order=pubdate",
    "https://api.bilibili.com/x/space/arc/search?mid=" + uid + "&ps=6&pn=1&order=click"
  ];
  const ref = { Referer: "https://space.bilibili.com/" + uid };
  for (const u of apiUrls) {
    try {
      const d = await getJson(u, ref);
      const vlist = (d.data && d.data.vlist) ? d.data.vlist : [];
      const titles = pick(vlist, 4).map(function (x) { return x.title; }).filter(Boolean);
      if (titles.length) { console.log("  ok up:", uid, "bilibili api"); return titles; }
    } catch (e) { console.log("  fail up:", uid, "bilibili api", e.message); }
  }
  // 兜底：RSSHub 多实例
  for (const hub of RSSHUBS) {
    try {
      const txt = await get(hub + "/bilibili/user/video/" + uid);
      const titles = parseRssTitles(txt, 4);
      if (titles.length) { console.log("  ok up rss:", uid, hub); return titles; }
    } catch (e) { console.log("  fail up rss:", uid, hub, e.message); }
  }
  return [];
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
    const wallDir = path.join(__dirname, "..", "data");
    fs.mkdirSync(wallDir, { recursive: true });
    fs.writeFileSync(path.join(wallDir, "wallpaper.jpg"), buf);
    return img.copyright || "";
  } catch (e) { console.log("  fail wallpaper:", e.message); return ""; }
}

async function main() {
  const dir = path.join(__dirname, "..", "data");
  fs.mkdirSync(dir, { recursive: true });

  console.log("stage 1/3: hotlists");
  const bili = await biliHot();
  const zhihu = await zhihuHot();
  const weibo = await weiboHot();

  console.log("stage 2/3: up dynamics");
  const ups = [];
  for (const u of UP_UIDS) {
    console.log("  up:", u.name);
    const titles = await upVideos(u.uid);
    if (titles.length) { ups.push({ name: u.name, titles: titles }); }
  }

  console.log("stage 2.5/3: wallpaper");
  const wallpaperCaption = await bingWallpaper();

  const out = {
    generated: new Date().toISOString(),
    bili: bili,
    zhihu: zhihu,
    weibo: weibo,
    ups: ups,
    wallpaperCaption: wallpaperCaption
  };
  fs.writeFileSync(path.join(dir, "feeds.json"), JSON.stringify(out, null, 2));
  console.log("stage 3/3: done, bili=" + bili.length + " zhihu=" + zhihu.length + " weibo=" + weibo.length + " ups=" + ups.length);
}

main().catch(function (e) { console.error(e); process.exit(1); });
