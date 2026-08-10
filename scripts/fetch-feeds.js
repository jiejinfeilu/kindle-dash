// 在 GitHub Actions 上运行：定时抓取热榜与 UP主动态，写入 data/feeds.json
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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
const MIXIN_KEY_ENC_TAB = [46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13,37,48,7,16,24,55,40,61,26,17,0,1,60,51,30,4,22,25,54,21,56,59,6,63,57,62,11,36,20,34,44,52];

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

async function rssHot(url) {
  try {
    const txt = await get(url);
    const titles = parseRssTitles(txt, 6);
    if (titles.length) { console.log("  ok rss:", url); return titles; }
    console.log("  empty rss:", url);
  } catch (e) { console.log("  fail rss:", url, e.message); }
  return [];
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

function getMixinKey(orig) {
  return MIXIN_KEY_ENC_TAB.map(function (i) { return orig[i]; }).join("");
}

async function getWbiKeys() {
  const d = await getJson("https://api.bilibili.com/x/web-interface/nav");
  const wbi = d.data && d.data.wbi_img;
  if (!wbi || !wbi.img_url || !wbi.sub_url) { throw new Error("no wbi keys"); }
  const ik = wbi.img_url.slice(wbi.img_url.lastIndexOf("/") + 1, wbi.img_url.lastIndexOf("."));
  const sk = wbi.sub_url.slice(wbi.sub_url.lastIndexOf("/") + 1, wbi.sub_url.lastIndexOf("."));
  return getMixinKey(ik + sk);
}

function signParams(params, mixinKey) {
  const wts = Math.floor(Date.now() / 1000);
  params.wts = wts;
  const keys = Object.keys(params).sort();
  let q = "";
  for (const k of keys) {
    if (params[k] === undefined || params[k] === null) { continue; }
    if (q) { q += "&"; }
    q += encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
  }
  params.w_rid = crypto.createHash("md5").update(q + mixinKey).digest("hex");
  return params;
}

let BUV = "";

async function getBuvid() {
  try {
    const d = await getJson("https://api.bilibili.com/x/frontend/finger/spi");
    const b3 = d.data && d.data.b_3;
    if (b3) { BUV = "buvid3=" + b3; }
  } catch (e) { console.log("  fail buvid:", e.message); }
}

function stripTags(s) {
  return String(s).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
}

async function upVideosBySearch(name) {
  try {
    const url = "https://api.bilibili.com/x/web-interface/search/type?search_type=video&order=pubdate&page=1&keyword=" + encodeURIComponent(name);
    const d = await getJson(url, { Referer: "https://search.bilibili.com/" });
    const list = (d.data && d.data.result) ? d.data.result : [];
    const out = [];
    for (const v of list) {
      if (out.length >= 4) { break; }
      const author = v.author || "";
      if (author && (author.indexOf(name) >= 0 || name.indexOf(author) >= 0)) {
        const t = stripTags(v.title);
        if (t) { out.push(t); }
      }
    }
    if (out.length) { console.log("  ok up search:", name); return out; }
    console.log("  empty up search:", name);
  } catch (e) { console.log("  fail up search:", name, e.message); }
  return [];
}

async function upVideos(uid, name) {
  try {
    if (!BUV) { await getBuvid(); }
    const mixinKey = await getWbiKeys();
    const params = signParams({ mid: uid, ps: 6, pn: 1, order: "pubdate" }, mixinKey);
    const keys = Object.keys(params);
    const qs = [];
    for (const k of keys) { qs.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k])); }
    const url = "https://api.bilibili.com/x/space/wbi/arc/search?" + qs.join("&");
    const headers = { Referer: "https://space.bilibili.com/" + uid };
    if (BUV) { headers.Cookie = BUV; }
    const d = await getJson(url, headers);
    const vlist = (d.data && d.data.list && d.data.list.vlist) ? d.data.list.vlist : [];
    const titles = pick(vlist, 4).map(function (x) { return x.title; }).filter(Boolean);
    if (titles.length) { console.log("  ok up:", uid, "wbi api"); return titles; }
    console.log("  empty up:", uid, "wbi api");
  } catch (e) { console.log("  fail up:", uid, "wbi api", e.message); }

  for (const hub of RSSHUBS) {
    try {
      const txt = await get(hub + "/bilibili/user/video/" + uid);
      const titles = parseRssTitles(txt, 4);
      if (titles.length) { console.log("  ok up rss:", uid, hub); return titles; }
    } catch (e) { console.log("  fail up rss:", uid, hub, e.message); }
  }
  return upVideosBySearch(name);
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
  const ithome = await rssHot("https://www.ithome.com/rss/");
  const sspai = await rssHot("https://sspai.com/feed");

  console.log("stage 2/3: up dynamics");
  const ups = [];
  for (const u of UP_UIDS) {
    console.log("  up:", u.name);
    const titles = await upVideos(u.uid, u.name);
    if (titles.length) { ups.push({ name: u.name, titles: titles }); }
  }

  console.log("stage 2.5/3: wallpaper");
  const wallpaperCaption = await bingWallpaper();

  const out = {
    generated: new Date().toISOString(),
    bili: bili,
    ithome: ithome,
    sspai: sspai,
    ups: ups,
    wallpaperCaption: wallpaperCaption
  };
  fs.writeFileSync(path.join(dir, "feeds.json"), JSON.stringify(out, null, 2));
  console.log("stage 3/3: done, bili=" + bili.length + " ithome=" + ithome.length + " sspai=" + sspai.length + " ups=" + ups.length);
}

main().catch(function (e) { console.error(e); process.exit(1); });
