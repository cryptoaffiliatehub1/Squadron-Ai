const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
];

const REFERERS = [
  "https://dexscreener.com/",
  "https://birdeye.so/",
  "https://solscan.io/",
  "https://raydium.io/",
  "https://jup.ag/",
];

let uaIndex = 0;

export function getRotatedHeaders(): Record<string, string> {
  const ua = USER_AGENTS[uaIndex % USER_AGENTS.length];
  uaIndex++;
  const referer = REFERERS[Math.floor(Math.random() * REFERERS.length)];
  return {
    "User-Agent": ua,
    Referer: referer,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  };
}
