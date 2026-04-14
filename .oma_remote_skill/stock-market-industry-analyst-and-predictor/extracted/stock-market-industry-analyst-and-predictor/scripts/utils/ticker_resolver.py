"""
Ticker Resolver — local alias table + web_search fallback.
Covers A-shares, Hong Kong, US, Japan, Europe, and more.
"""

from typing import Dict, List, Optional
import re

TICKER_ALIASES: Dict[str, Dict] = {
    # ========== A-shares (China) ==========
    "CATL":       {"name": "宁德时代", "code": "300750", "market": "SZ",  "lang": "zh"},
    "BYD":        {"name": "比亚迪",   "code": "002594", "market": "SZ",  "lang": "zh"},
    "MOUTAI":     {"name": "贵州茅台", "code": "600519", "market": "SH",  "lang": "zh"},
    "KWEICHOW":   {"name": "贵州茅台", "code": "600519", "market": "SH",  "lang": "zh"},
    "PINGAN":     {"name": "中国平安", "code": "601318", "market": "SH",  "lang": "zh"},
    "ICBC":       {"name": "工商银行", "code": "601398", "market": "SH",  "lang": "zh"},
    "CMB":        {"name": "招商银行", "code": "600036", "market": "SH",  "lang": "zh"},
    "KUNLUN":     {"name": "昆仑万维", "code": "300418", "market": "SZ",  "lang": "zh"},
    "IFLYTEK":    {"name": "科大讯飞", "code": "002230", "market": "SZ",  "lang": "zh"},
    "HIKVISION":  {"name": "海康威视", "code": "002415", "market": "SZ",  "lang": "zh"},
    "CAMBRICON":  {"name": "寒武纪",   "code": "688256", "market": "SH",  "lang": "zh"},
    "SMIC":       {"name": "中芯国际", "code": "688981", "market": "SH",  "lang": "zh"},
    "NAURA":      {"name": "北方华创", "code": "002371", "market": "SZ",  "lang": "zh"},
    "LUXSHARE":   {"name": "立讯精密", "code": "002475", "market": "SZ",  "lang": "zh"},
    "LONGI":      {"name": "隆基绿能", "code": "601012", "market": "SH",  "lang": "zh"},

    # ========== Hong Kong ==========
    "TENCENT":    {"name": "腾讯控股", "code": "00700", "market": "HK",   "lang": "zh"},
    "ALIBABA":    {"name": "阿里巴巴", "code": "09988", "market": "HK",   "lang": "zh"},
    "MEITUAN":    {"name": "美团",     "code": "03690", "market": "HK",   "lang": "zh"},
    "JD":         {"name": "京东集团", "code": "09618", "market": "HK",   "lang": "zh"},
    "NETEASE":    {"name": "网易",     "code": "09999", "market": "HK",   "lang": "zh"},
    "BAIDU":      {"name": "百度集团", "code": "09888", "market": "HK",   "lang": "zh"},
    "KUAISHOU":   {"name": "快手",     "code": "01024", "market": "HK",   "lang": "zh"},
    "BILIBILI":   {"name": "哔哩哔哩", "code": "09626", "market": "HK",   "lang": "zh"},
    "XIAOMI":     {"name": "小米集团", "code": "01810", "market": "HK",   "lang": "zh"},
    "NIO":        {"name": "蔚来",     "code": "09866", "market": "HK",   "lang": "zh"},
    "XPENG":      {"name": "小鹏汽车", "code": "09868", "market": "HK",   "lang": "zh"},
    "LI AUTO":    {"name": "理想汽车", "code": "02015", "market": "HK",   "lang": "zh"},
    "LENOVO":     {"name": "联想集团", "code": "00992", "market": "HK",   "lang": "zh"},

    # ========== US ==========
    "AAPL":       {"name": "Apple",          "code": "AAPL",  "market": "NASDAQ", "lang": "en"},
    "APPLE":      {"name": "Apple",          "code": "AAPL",  "market": "NASDAQ", "lang": "en"},
    "MSFT":       {"name": "Microsoft",      "code": "MSFT",  "market": "NASDAQ", "lang": "en"},
    "MICROSOFT":  {"name": "Microsoft",      "code": "MSFT",  "market": "NASDAQ", "lang": "en"},
    "GOOGL":      {"name": "Alphabet",       "code": "GOOGL", "market": "NASDAQ", "lang": "en"},
    "GOOGLE":     {"name": "Alphabet",       "code": "GOOGL", "market": "NASDAQ", "lang": "en"},
    "AMZN":       {"name": "Amazon",         "code": "AMZN",  "market": "NASDAQ", "lang": "en"},
    "AMAZON":     {"name": "Amazon",         "code": "AMZN",  "market": "NASDAQ", "lang": "en"},
    "TSLA":       {"name": "Tesla",          "code": "TSLA",  "market": "NASDAQ", "lang": "en"},
    "TESLA":      {"name": "Tesla",          "code": "TSLA",  "market": "NASDAQ", "lang": "en"},
    "META":       {"name": "Meta Platforms",  "code": "META",  "market": "NASDAQ", "lang": "en"},
    "NVDA":       {"name": "NVIDIA",         "code": "NVDA",  "market": "NASDAQ", "lang": "en"},
    "NVIDIA":     {"name": "NVIDIA",         "code": "NVDA",  "market": "NASDAQ", "lang": "en"},
    "AMD":        {"name": "AMD",            "code": "AMD",   "market": "NASDAQ", "lang": "en"},
    "NFLX":       {"name": "Netflix",        "code": "NFLX",  "market": "NASDAQ", "lang": "en"},
    "NETFLIX":    {"name": "Netflix",        "code": "NFLX",  "market": "NASDAQ", "lang": "en"},
    "CRM":        {"name": "Salesforce",     "code": "CRM",   "market": "NYSE",   "lang": "en"},
    "JPM":        {"name": "JPMorgan Chase", "code": "JPM",   "market": "NYSE",   "lang": "en"},
    "V":          {"name": "Visa",           "code": "V",     "market": "NYSE",   "lang": "en"},
    "WMT":        {"name": "Walmart",        "code": "WMT",   "market": "NYSE",   "lang": "en"},
    "DIS":        {"name": "Walt Disney",    "code": "DIS",   "market": "NYSE",   "lang": "en"},
    "BA":         {"name": "Boeing",         "code": "BA",    "market": "NYSE",   "lang": "en"},
    "COIN":       {"name": "Coinbase",       "code": "COIN",  "market": "NASDAQ", "lang": "en"},
    "PLTR":       {"name": "Palantir",       "code": "PLTR",  "market": "NASDAQ", "lang": "en"},
    "ARM":        {"name": "Arm Holdings",   "code": "ARM",   "market": "NASDAQ", "lang": "en"},
    "SNOW":       {"name": "Snowflake",      "code": "SNOW",  "market": "NYSE",   "lang": "en"},
    "UBER":       {"name": "Uber",           "code": "UBER",  "market": "NYSE",   "lang": "en"},
    "SQ":         {"name": "Block",          "code": "SQ",    "market": "NYSE",   "lang": "en"},
    "SHOP":       {"name": "Shopify",        "code": "SHOP",  "market": "NYSE",   "lang": "en"},

    # ========== Japan ==========
    "TOYOTA":     {"name": "トヨタ自動車",    "code": "7203",  "market": "TSE",    "lang": "ja"},
    "SONY":       {"name": "ソニーグループ",   "code": "6758",  "market": "TSE",    "lang": "ja"},
    "NINTENDO":   {"name": "任天堂",          "code": "7974",  "market": "TSE",    "lang": "ja"},
    "SOFTBANK":   {"name": "ソフトバンクG",    "code": "9984",  "market": "TSE",    "lang": "ja"},
    "KEYENCE":    {"name": "キーエンス",       "code": "6861",  "market": "TSE",    "lang": "ja"},
    "HITACHI":    {"name": "日立製作所",       "code": "6501",  "market": "TSE",    "lang": "ja"},
    "FAST RETAILING": {"name": "ファーストリテイリング", "code": "9983", "market": "TSE", "lang": "ja"},
    "UNIQLO":     {"name": "ファーストリテイリング", "code": "9983", "market": "TSE", "lang": "ja"},

    # ========== Europe ==========
    "ASML":       {"name": "ASML Holding",    "code": "ASML",  "market": "AMS",    "lang": "en"},
    "LVMH":       {"name": "LVMH",            "code": "MC",    "market": "PAR",    "lang": "en"},
    "SAP":        {"name": "SAP",             "code": "SAP",   "market": "FRA",    "lang": "en"},
    "NESTLE":     {"name": "Nestlé",          "code": "NESN",  "market": "SWX",    "lang": "en"},
    "NOVARTIS":   {"name": "Novartis",        "code": "NOVN",  "market": "SWX",    "lang": "en"},
    "SIEMENS":    {"name": "Siemens",         "code": "SIE",   "market": "FRA",    "lang": "en"},
    "SHELL":      {"name": "Shell",           "code": "SHEL",  "market": "LSE",    "lang": "en"},
    "HSBC":       {"name": "HSBC",            "code": "HSBA",  "market": "LSE",    "lang": "en"},
    "ASTRAZENECA": {"name": "AstraZeneca",    "code": "AZN",   "market": "LSE",    "lang": "en"},
    "NOVO NORDISK": {"name": "Novo Nordisk",  "code": "NOVO-B","market": "CPH",    "lang": "en"},

    # ========== Korea ==========
    "SAMSUNG":    {"name": "삼성전자",         "code": "005930", "market": "KRX",   "lang": "ko"},
    "SK HYNIX":   {"name": "SK하이닉스",       "code": "000660", "market": "KRX",   "lang": "ko"},
    "HYUNDAI":    {"name": "현대자동차",        "code": "005380", "market": "KRX",   "lang": "ko"},

    # ========== Crypto ==========
    "BTC":        {"name": "Bitcoin",         "code": "BTC-USD",  "market": "CRYPTO", "lang": "en"},
    "BITCOIN":    {"name": "Bitcoin",         "code": "BTC-USD",  "market": "CRYPTO", "lang": "en"},
    "ETH":        {"name": "Ethereum",        "code": "ETH-USD",  "market": "CRYPTO", "lang": "en"},
    "ETHEREUM":   {"name": "Ethereum",        "code": "ETH-USD",  "market": "CRYPTO", "lang": "en"},
    "SOL":        {"name": "Solana",          "code": "SOL-USD",  "market": "CRYPTO", "lang": "en"},
    "SOLANA":     {"name": "Solana",          "code": "SOL-USD",  "market": "CRYPTO", "lang": "en"},
}


# Market → search language mapping
MARKET_LANG = {
    "SH": "zh", "SZ": "zh", "HK": "zh",
    "NASDAQ": "en", "NYSE": "en", "LSE": "en", "AMS": "en",
    "PAR": "en", "FRA": "en", "SWX": "en", "CPH": "en",
    "TSE": "ja",
    "KRX": "ko",
    "CRYPTO": "en",
}


def resolve_ticker(query: str) -> Optional[Dict]:
    """
    Resolve a ticker from the local alias table.
    Accepts: code ("AAPL"), alias ("TESLA"), Chinese name ("宁德时代"), or numeric code ("300750").
    Returns dict with name/code/market/lang, or None to fall back to web_search.
    """
    clean = re.sub(r'\.(SZ|SH|HK|US|SS|L|PA|DE|T|KS)$', '', query.strip(), flags=re.IGNORECASE)
    upper = clean.upper()

    # Exact alias match
    if upper in TICKER_ALIASES:
        return TICKER_ALIASES[upper]

    # Match by code
    for _, info in TICKER_ALIASES.items():
        if info["code"].upper() == upper:
            return info

    # Match by name (substring)
    for _, info in TICKER_ALIASES.items():
        if clean in info["name"] or info["name"] in clean:
            return info

    return None


def get_search_lang(market: str) -> str:
    """Get the appropriate search language for a market."""
    return MARKET_LANG.get(market, "en")


def get_search_queries(name: str, code: str, lang: str = "en") -> Dict[str, List[str]]:
    """
    Generate web_search queries adapted to the target language.
    """
    if lang == "zh":
        return {
            "price": [
                f"{name} {code} 最新股价 今日行情",
                f"{name} 近一周 涨跌幅 成交量",
            ],
            "news": [
                f"{name} 最新新闻 公告",
                f"{name} 所属行业 政策 趋势",
            ],
            "analysis": [
                f"{name} {code} 技术分析 支撑位 压力位 均线",
                f"{name} 机构评级 研报 目标价",
            ],
        }
    elif lang == "ja":
        return {
            "price": [
                f"{name} {code} 株価 今日",
                f"{name} 週間 値動き 出来高",
            ],
            "news": [
                f"{name} 最新ニュース",
                f"{name} 業界 動向",
            ],
            "analysis": [
                f"{name} {code} テクニカル分析 サポート レジスタンス",
                f"{name} アナリスト 目標株価",
            ],
        }
    elif lang == "ko":
        return {
            "price": [
                f"{name} {code} 주가 오늘",
                f"{name} 주간 등락률 거래량",
            ],
            "news": [
                f"{name} 최신 뉴스",
                f"{name} 산업 동향",
            ],
            "analysis": [
                f"{name} {code} 기술적분석 지지 저항",
                f"{name} 애널리스트 목표가",
            ],
        }
    else:  # English (default)
        return {
            "price": [
                f"{name} {code} stock price today",
                f"{name} past week price change volume",
            ],
            "news": [
                f"{name} latest news announcement",
                f"{name} industry sector trend",
            ],
            "analysis": [
                f"{name} {code} technical analysis support resistance",
                f"{name} analyst rating target price",
            ],
        }
