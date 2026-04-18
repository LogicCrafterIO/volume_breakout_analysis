import pandas as pd
import yfinance as yf
from pathlib import Path
import time

# =========================
# CONFIG
# =========================
INPUT_CSV = "volume_breakout_trades.csv"
TICKER_COLUMN = "Ticker"
START_DATE = "2015-01-01"
END_DATE = "2026-04-15"
OUTPUT_DIR = "yfinance_data"
COMBINED_OUTPUT = "all_tickers_data.csv"

# =========================
# LOAD & EXTRACT TICKERS
# =========================
def get_unique_tickers(csv_path, ticker_col):
    df = pd.read_csv(csv_path)

    if ticker_col not in df.columns:
        raise ValueError(f"Column '{ticker_col}' not found in CSV")

    tickers = (
        df[ticker_col]
        .dropna()
        .astype(str)
        .str.strip()
        .unique()
        .tolist()
    )

    return tickers


# =========================
# DOWNLOAD DATA
# =========================
def download_data(tickers, start, end, output_dir):
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    all_data = []

    for i, ticker in enumerate(tickers):
        print(f"[{i+1}/{len(tickers)}] Downloading {ticker}...")

        try:
            data = yf.download(
                ticker,
                start=start,
                end=end,
                progress=False,
                auto_adjust=True
            )

            if data.empty:
                print(f"⚠️ No data for {ticker}")
                continue

            data.reset_index(inplace=True)
            data["Ticker"] = ticker

            # Save individual file
            output_path = Path(output_dir) / f"{ticker}.csv"
            data.to_csv(output_path, index=False)

            all_data.append(data)

            # small delay to avoid throttling
            time.sleep(0.5)

        except Exception as e:
            print(f"❌ Error downloading {ticker}: {e}")

    return all_data


# =========================
# MAIN
# =========================
def main():
    tickers = get_unique_tickers(INPUT_CSV, TICKER_COLUMN)

    print(f"Found {len(tickers)} unique tickers")

    all_data = download_data(
        tickers,
        START_DATE,
        END_DATE,
        OUTPUT_DIR
    )

    if all_data:
        combined_df = pd.concat(all_data, ignore_index=True)
        combined_df.to_csv(COMBINED_OUTPUT, index=False)
        print(f"✅ Combined data saved to {COMBINED_OUTPUT}")

    print("✅ Done")


if __name__ == "__main__":
    main()