"""
Stock Data Provider — unified interface for fetching OHLCV data and computing technical indicators.

Data sources:
  - A-shares + HK: akshare (via eastmoney)
  - US / JP / EU / Crypto / everything else: yfinance

Dependencies: akshare, yfinance, pandas, numpy
Install: pip install akshare yfinance pandas numpy
"""

import pandas as pd
import numpy as np
from typing import Optional, Dict, Any


def fetch_ohlcv(ticker: str, market: str, days: int = 90) -> pd.DataFrame:
    """
    Fetch daily OHLCV data. Returns a DataFrame with columns:
    date, open, high, low, close, volume

    Args:
        ticker: Stock code. A-shares: "300418", HK: "00700", US: "NVDA", etc.
        market: One of "SH", "SZ", "HK", "NASDAQ", "NYSE", "TSE", "LSE", etc.
        days: Number of calendar days of history to fetch (default 90).

    Returns:
        DataFrame with standardized columns, sorted by date ascending.
        Empty DataFrame if fetch fails.
    """
    try:
        if market in ("SH", "SZ"):
            return _fetch_akshare_a(ticker, days)
        elif market == "HK":
            return _fetch_akshare_hk(ticker, days)
        else:
            return _fetch_yfinance(ticker, market, days)
    except Exception as e:
        print(f"[stock_data] Failed to fetch {ticker} ({market}): {e}")
        return pd.DataFrame()


def compute_technicals(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute common technical indicators from OHLCV data.

    Returns a dict with:
        ma5, ma10, ma20, ma60: moving averages (latest value)
        rsi_14: 14-period RSI
        macd, macd_signal, macd_hist: MACD line, signal line, histogram
        support: estimated support level (recent 20-day low)
        resistance: estimated resistance level (recent 20-day high)
        trend: "bullish" / "bearish" / "neutral" based on MA alignment
        latest: dict of the most recent OHLCV row
        change_5d: 5-day price change percentage
        change_20d: 20-day price change percentage
    """
    if df.empty or len(df) < 20:
        return {"error": "Insufficient data for technical analysis"}

    close = df["close"].astype(float)

    # Moving averages
    ma5 = close.rolling(5).mean()
    ma10 = close.rolling(10).mean()
    ma20 = close.rolling(20).mean()
    ma60 = close.rolling(60).mean() if len(close) >= 60 else pd.Series([np.nan])

    # RSI (14-period)
    delta = close.diff()
    gain = delta.where(delta > 0, 0.0).rolling(14).mean()
    loss = (-delta.where(delta < 0, 0.0)).rolling(14).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))

    # MACD (12, 26, 9)
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    macd_hist = macd_line - signal_line

    # Support / Resistance (20-day)
    support = float(df["low"].astype(float).tail(20).min())
    resistance = float(df["high"].astype(float).tail(20).max())

    # Trend determination
    latest_close = float(close.iloc[-1])
    latest_ma5 = float(ma5.iloc[-1]) if not np.isnan(ma5.iloc[-1]) else None
    latest_ma20 = float(ma20.iloc[-1]) if not np.isnan(ma20.iloc[-1]) else None

    if latest_ma5 and latest_ma20:
        if latest_ma5 > latest_ma20 and latest_close > latest_ma5:
            trend = "bullish"
        elif latest_ma5 < latest_ma20 and latest_close < latest_ma5:
            trend = "bearish"
        else:
            trend = "neutral"
    else:
        trend = "neutral"

    # Price changes
    change_5d = float((close.iloc[-1] / close.iloc[-6] - 1) * 100) if len(close) >= 6 else None
    change_20d = float((close.iloc[-1] / close.iloc[-21] - 1) * 100) if len(close) >= 21 else None

    latest_row = df.iloc[-1]

    return {
        "latest": {
            "date": str(latest_row["date"]),
            "open": float(latest_row["open"]),
            "high": float(latest_row["high"]),
            "low": float(latest_row["low"]),
            "close": float(latest_row["close"]),
            "volume": float(latest_row["volume"]),
        },
        "ma5": round(float(ma5.iloc[-1]), 2) if not np.isnan(ma5.iloc[-1]) else None,
        "ma10": round(float(ma10.iloc[-1]), 2) if not np.isnan(ma10.iloc[-1]) else None,
        "ma20": round(float(ma20.iloc[-1]), 2) if not np.isnan(ma20.iloc[-1]) else None,
        "ma60": round(float(ma60.iloc[-1]), 2) if len(ma60) > 0 and not np.isnan(ma60.iloc[-1]) else None,
        "rsi_14": round(float(rsi.iloc[-1]), 2) if not np.isnan(rsi.iloc[-1]) else None,
        "macd": round(float(macd_line.iloc[-1]), 4),
        "macd_signal": round(float(signal_line.iloc[-1]), 4),
        "macd_hist": round(float(macd_hist.iloc[-1]), 4),
        "support": round(support, 2),
        "resistance": round(resistance, 2),
        "trend": trend,
        "change_5d": round(change_5d, 2) if change_5d is not None else None,
        "change_20d": round(change_20d, 2) if change_20d is not None else None,
    }


def format_technicals(t: Dict) -> str:
    """Format technical indicators into a readable string for use in prompts."""
    if "error" in t:
        return t["error"]

    latest = t["latest"]
    lines = [
        f"Latest: {latest['date']} | O:{latest['open']} H:{latest['high']} L:{latest['low']} C:{latest['close']} V:{latest['volume']:,.0f}",
        f"MA: 5={t['ma5']} | 10={t['ma10']} | 20={t['ma20']} | 60={t['ma60']}",
        f"RSI(14): {t['rsi_14']}",
        f"MACD: {t['macd']} | Signal: {t['macd_signal']} | Hist: {t['macd_hist']}",
        f"Support: {t['support']} | Resistance: {t['resistance']}",
        f"Trend: {t['trend']}",
        f"Change: 5d={t['change_5d']}% | 20d={t['change_20d']}%",
    ]
    return "\n".join(lines)


# =====================================================
# Internal: akshare (A-shares + HK)
# =====================================================

def _fetch_akshare_a(ticker: str, days: int) -> pd.DataFrame:
    import akshare as ak
    from datetime import datetime, timedelta

    end = datetime.now().strftime("%Y%m%d")
    start = (datetime.now() - timedelta(days=days)).strftime("%Y%m%d")

    df = ak.stock_zh_a_hist(symbol=ticker, period="daily", start_date=start, end_date=end, adjust="qfq")
    df = df.rename(columns={
        "日期": "date", "开盘": "open", "收盘": "close",
        "最高": "high", "最低": "low", "成交量": "volume",
    })
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    return df[["date", "open", "high", "low", "close", "volume"]].reset_index(drop=True)


def _fetch_akshare_hk(ticker: str, days: int) -> pd.DataFrame:
    import akshare as ak
    from datetime import datetime, timedelta

    end = datetime.now().strftime("%Y%m%d")
    start = (datetime.now() - timedelta(days=days)).strftime("%Y%m%d")

    df = ak.stock_hk_hist(symbol=ticker, period="daily", start_date=start, end_date=end, adjust="qfq")
    df = df.rename(columns={
        "日期": "date", "开盘": "open", "收盘": "close",
        "最高": "high", "最低": "low", "成交量": "volume",
    })
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    return df[["date", "open", "high", "low", "close", "volume"]].reset_index(drop=True)


# =====================================================
# Internal: yfinance (US / JP / EU / Crypto / etc)
# =====================================================

def _fetch_yfinance(ticker: str, market: str, days: int) -> pd.DataFrame:
    import yfinance as yf

    # Map market to yfinance suffix
    suffix_map = {
        "NASDAQ": "", "NYSE": "",  # US tickers have no suffix
        "TSE": ".T",    # Tokyo
        "KRX": ".KS",   # Korea
        "LSE": ".L",    # London
        "FRA": ".DE",   # Frankfurt
        "PAR": ".PA",   # Paris
        "AMS": ".AS",   # Amsterdam
        "SWX": ".SW",   # Swiss
        "CPH": ".CO",   # Copenhagen
        "CRYPTO": "",   # BTC-USD already has the right format
    }

    suffix = suffix_map.get(market, "")
    yf_ticker = f"{ticker}{suffix}" if suffix and not ticker.endswith(suffix) else ticker

    period = "3mo" if days <= 90 else "6mo" if days <= 180 else "1y"
    df = yf.download(yf_ticker, period=period, progress=False, auto_adjust=True)

    if df.empty:
        return pd.DataFrame()

    # Flatten multi-level columns if present
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [col[0] for col in df.columns]

    df = df.reset_index()
    df = df.rename(columns={
        "Date": "date", "Open": "open", "High": "high",
        "Low": "low", "Close": "close", "Volume": "volume",
    })
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    return df[["date", "open", "high", "low", "close", "volume"]].reset_index(drop=True)
