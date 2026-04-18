import pandas as pd
import mplfinance as mpf
import os
import numpy as np
from datetime import datetime
from concurrent.futures import ProcessPoolExecutor, as_completed
import multiprocessing

# --- Configuration ---
TRADES_CSV = 'volume_breakout_trades.csv'
PRICE_DATA_DIR = 'yfinance_data'
OUTPUT_BASE_DIR = 'trade_charts'

PROCESS_ALL_TRADES = True
NUM_TRADES_TO_PROCESS = 10

DAYS_BEFORE = 20
DAYS_AFTER = 20

MAX_WORKERS = max(1, multiprocessing.cpu_count() - 1)

def get_safe_value(val, fmt=".2f"):
    if pd.isna(val):
        return "N/A"
    if fmt == ".1f":
        return f"{val:.1f}"
    return f"{val:{fmt}}"

def process_trade(row_dict):
    try:
        trade_num = row_dict['Trade_Num']
        ticker = row_dict['Ticker']
        entry_date_str = row_dict['Entry_Date']
        result = str(row_dict['Result']).strip()

        entry_date = pd.to_datetime(entry_date_str)

        # --- Folder ---
        if result.lower() == "win":
            result_folder = "Winners"
        elif result.lower() == "loss":
            result_folder = "Losers"
        else:
            result_folder = "Unknown"

        year_str = entry_date.strftime('%Y')
        month_str = entry_date.strftime('%B')

        output_dir = os.path.join(
            OUTPUT_BASE_DIR,
            year_str,
            month_str,
            result_folder
        )
        os.makedirs(output_dir, exist_ok=True)

        # --- Load price ---
        price_file = os.path.join(PRICE_DATA_DIR, f"{ticker}.csv")
        if not os.path.exists(price_file):
            return f"[{trade_num}] Skip {ticker}: no price file"

        df_price = pd.read_csv(price_file, parse_dates=['Date'], index_col='Date')
        df_price = df_price[df_price.index.notna()]

        required_cols = ['Open', 'High', 'Low', 'Close', 'Volume']
        if not all(col in df_price.columns for col in required_cols):
            return f"[{trade_num}] Skip {ticker}: bad columns"

        df_price[required_cols] = df_price[required_cols].apply(pd.to_numeric, errors='coerce')

        if entry_date not in df_price.index:
            valid_dates = df_price.index[df_price.index >= entry_date]
            if len(valid_dates) == 0:
                return f"[{trade_num}] Skip {ticker}: no future data"
            entry_date = valid_dates[0]

        entry_idx = df_price.index.get_loc(entry_date)
        start_idx = max(0, entry_idx - DAYS_BEFORE)
        end_idx = min(len(df_price) - 1, entry_idx + DAYS_AFTER)

        chart_df = df_price.iloc[start_idx:end_idx + 1].copy()

        if len(chart_df) < 2:
            return f"[{trade_num}] Skip {ticker}: not enough data"

        # --- Prices ---
        entry_price = pd.to_numeric(row_dict.get('Entry_Price'), errors='coerce')
        sl_price = pd.to_numeric(row_dict.get('SL'), errors='coerce')
        tp_price = pd.to_numeric(row_dict.get('TP'), errors='coerce')

        price_min = chart_df['Low'].min()
        price_max = chart_df['High'].max()
        price_range = price_max - price_min

        # --- hlines ---
        hlines_dict = None
        hlines, colors, linewidths, linestyles = [], [], [], []

        if pd.notna(price_range) and price_range > 0:
            padding = price_range * 0.1

            if pd.notna(entry_price):
                hlines.append(entry_price)
                colors.append('blue')
                linewidths.append(1.5)
                linestyles.append('--')

            if pd.notna(sl_price):
                hlines.append(sl_price)
                colors.append('red')
                linewidths.append(1.2)
                linestyles.append('-.')

            if pd.notna(tp_price):
                hlines.append(tp_price)
                colors.append('green')
                linewidths.append(1.2)
                linestyles.append('-.')

        if hlines:
            hlines_dict = dict(
                hlines=hlines,
                colors=colors,
                linewidths=linewidths,
                linestyle=linestyles
            )

        # --- Entry marker (SAFE OFFSET) ---
        entry_marker = None
        if entry_date in chart_df.index and price_range > 0:
            marker_series = np.full(len(chart_df), np.nan)

            idx_position = chart_df.index.get_loc(entry_date)

            # key fix: dynamic offset
            offset = price_range * 0.05   # 5% of range → always above wick
            marker_y = chart_df.iloc[idx_position]['High'] + offset

            marker_series[idx_position] = marker_y

            entry_marker = mpf.make_addplot(
                marker_series,
                type='scatter',
                markersize=120,
                marker='^',
                color='purple'
            )

        # --- Metrics ---
        try:
            hold_days = int(row_dict['Hold_Days'])
        except:
            hold_days = "N/A"

        metrics_text = (
            f"Result: {result} ({get_safe_value(row_dict['PnL_Pct'])}%)\n"
            f"Exit Reason: {row_dict['Exit_Reason']}\n"
            f"----------------------------\n"
            f"Entry: {get_safe_value(entry_price)}\n"
            f"SL: {get_safe_value(sl_price)}\n"
            f"TP: {get_safe_value(tp_price)}\n"
            f"----------------------------\n"
            f"RSI: {get_safe_value(row_dict['RSI'], '.1f')}\n"
            f"RVOL: {get_safe_value(row_dict['RVOL'])}\n"
            f"ATR_14: {get_safe_value(row_dict['ATR_14'])}\n"
            f"Hold Days: {hold_days}"
        )

        # --- Style ---
        mc = mpf.make_marketcolors(up='g', down='r', edge='i', wick='i', volume='in')
        s = mpf.make_mpf_style(marketcolors=mc, gridstyle=':', y_on_right=False)

        fig, axes = mpf.plot(
            chart_df,
            type='candle',
            style=s,
            volume=True,
            title=f"\n{ticker} | Trade #{trade_num} | {entry_date_str}",
            hlines=hlines_dict,
            addplot=entry_marker if entry_marker else None,
            returnfig=True
        )

        fig.text(
            0.02, 0.95, metrics_text,
            fontsize=9,
            verticalalignment='top',
            fontfamily='monospace',
            bbox=dict(boxstyle='round,pad=0.5', facecolor='white', alpha=0.8)
        )

        output_filename = f"{trade_num}_{ticker}_{entry_date_str}.png"
        output_path = os.path.join(output_dir, output_filename)

        fig.savefig(output_path, dpi=120, bbox_inches='tight', pad_inches=0.5)

        import matplotlib.pyplot as plt
        plt.close(fig)

        return f"[{trade_num}] Saved"

    except Exception as e:
        return f"[ERROR] {e}"

def main():
    if not os.path.exists(TRADES_CSV):
        print("Trades CSV not found.")
        return

    df_trades = pd.read_csv(TRADES_CSV)

    if PROCESS_ALL_TRADES:
        trades = df_trades
        print(f"Processing ALL trades ({len(trades)}) with {MAX_WORKERS} workers...")
    else:
        trades = df_trades.head(NUM_TRADES_TO_PROCESS)
        print(f"Processing {NUM_TRADES_TO_PROCESS} trades with {MAX_WORKERS} workers...")

    rows = trades.to_dict('records')

    with ProcessPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(process_trade, row) for row in rows]

        for i, future in enumerate(as_completed(futures), 1):
            if i % 100 == 0:
                print(f"Progress: {i}/{len(futures)}")
            print(future.result())

    print("Done!")

if __name__ == "__main__":
    main()