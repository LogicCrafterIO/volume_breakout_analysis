import pandas as pd
import mplfinance as mpf
import os
from datetime import datetime

# --- Configuration ---
TRADES_CSV = 'volume_breakout_trades.csv'
PRICE_DATA_DIR = 'yfinance_data'
OUTPUT_BASE_DIR = 'trade_charts'
NUM_TRADES_TO_PROCESS = 10
DAYS_BEFORE = 20
DAYS_AFTER = 20

def get_safe_value(val, fmt=".2f"):
    """Safely format values, returning 'N/A' if NaN or missing."""
    if pd.isna(val):
        return "N/A"
    if fmt == ".1f":
        return f"{val:.1f}"
    return f"{val:{fmt}}"

def main():
    # 1. Load the trades CSV
    if not os.path.exists(TRADES_CSV):
        print(f"Error: Could not find {TRADES_CSV}")
        return

    df_trades = pd.read_csv(TRADES_CSV)
    df_trades = df_trades.head(NUM_TRADES_TO_PROCESS)

    # 2. Setup Plotting Style
    mc = mpf.make_marketcolors(up='g', down='r', edge='i', wick='i', volume='in')
    s = mpf.make_mpf_style(marketcolors=mc, gridstyle=':', y_on_right=False)

    print(f"Starting chart generation for {NUM_TRADES_TO_PROCESS} trades...")

    for index, row in df_trades.iterrows():
        trade_num = row['Trade_Num']
        ticker = row['Ticker']
        entry_date_str = row['Entry_Date']

        try:
            entry_date = pd.to_datetime(entry_date_str)
        except Exception as e:
            print(f"[{trade_num}] Skipping {ticker}: Invalid Entry_Date format. {e}")
            continue

        # 3. Output Directory
        year_str = entry_date.strftime('%Y')
        month_str = entry_date.strftime('%B')
        output_dir = os.path.join(OUTPUT_BASE_DIR, year_str, month_str)
        os.makedirs(output_dir, exist_ok=True)

        # 4. Load Price Data
        price_file = os.path.join(PRICE_DATA_DIR, f"{ticker}.csv")
        if not os.path.exists(price_file):
            print(f"[{trade_num}] Skipping {ticker}: Price file not found")
            continue

        df_price = pd.read_csv(price_file, parse_dates=['Date'], index_col='Date')
        df_price = df_price[df_price.index.notna()]

        required_cols = ['Open', 'High', 'Low', 'Close', 'Volume']
        if not all(col in df_price.columns for col in required_cols):
            print(f"[{trade_num}] Skipping {ticker}: Missing OHLCV columns.")
            continue

        df_price[required_cols] = df_price[required_cols].apply(pd.to_numeric, errors='coerce')

        # 5. Handle non-trading entry dates
        if entry_date not in df_price.index:
            valid_dates = df_price.index[df_price.index >= entry_date]
            if len(valid_dates) == 0:
                print(f"[{trade_num}] Skipping {ticker}: Entry date beyond data.")
                continue
            entry_date = valid_dates[0]

        # 6. Slice Data
        entry_idx = df_price.index.get_loc(entry_date)
        start_idx = max(0, entry_idx - DAYS_BEFORE)
        end_idx = min(len(df_price) - 1, entry_idx + DAYS_AFTER)
        chart_df = df_price.iloc[start_idx:end_idx + 1].copy()

        if len(chart_df) < 2:
            print(f"[{trade_num}] Skipping {ticker}: Not enough data.")
            continue

        # 7. Prices
        entry_price = pd.to_numeric(row.get('Entry_Price'), errors='coerce')
        sl_price = pd.to_numeric(row.get('SL'), errors='coerce')
        tp_price = pd.to_numeric(row.get('TP'), errors='coerce')

        price_min = chart_df['Low'].min()
        price_max = chart_df['High'].max()

        # FIXED hlines structure
        hlines_dict = None
        hlines = []
        colors = []
        linewidths = []
        linestyles = []

        if pd.notna(price_min) and pd.notna(price_max):
            padding = (price_max - price_min) * 0.1  # tighter padding

            if pd.notna(entry_price) and (price_min - padding) < entry_price < (price_max + padding):
                hlines.append(entry_price)
                colors.append('blue')
                linewidths.append(1.5)
                linestyles.append('--')

            if pd.notna(sl_price) and (price_min - padding) < sl_price < (price_max + padding):
                hlines.append(sl_price)
                colors.append('red')
                linewidths.append(1.2)
                linestyles.append('-.')

            if pd.notna(tp_price) and (price_min - padding) < tp_price < (price_max + padding):
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

        # Vertical line
        vlines_dict = dict(vlines=[entry_date], colors=['purple'], linewidths=1.5, linestyle='-')

        # 8. Metrics Box
        result = row['Result']
        result_color = 'green' if result == 'Win' else 'red'

        metrics_text = (
            f"Result: {result} ({get_safe_value(row['PnL_Pct'])}%)\n"
            f"Exit Reason: {row['Exit_Reason']}\n"
            f"----------------------------\n"
            f"Entry: {get_safe_value(entry_price)}\n"
            f"SL: {get_safe_value(sl_price)} (Red)\n"
            f"TP: {get_safe_value(tp_price)} (Green)\n"
            f"----------------------------\n"
            f"RSI (Signal): {get_safe_value(row['RSI'], '.1f')}\n"
            f"RVOL: {get_safe_value(row['RVOL'])}\n"
            f"ATR_14: {get_safe_value(row['ATR_14'])}\n"
            f"Hold Days: {int(row['Hold_Days'])}"
        )

        # 9. Plot
        fig, axes = mpf.plot(
            chart_df,
            type='candle',
            style=s,
            volume=True,
            title=f"\n{ticker} | Trade #{trade_num} | {entry_date_str}",
            hlines=hlines_dict,
            vlines=vlines_dict,
            returnfig=True
        )

        fig.text(
            0.02, 0.95, metrics_text,
            fontsize=9,
            verticalalignment='top',
            fontfamily='monospace',
            bbox=dict(boxstyle='round,pad=0.5', facecolor='white', alpha=0.8, edgecolor='gray')
        )

        # 10. Save
        output_filename = f"{trade_num}_{ticker}_{entry_date_str}.png"
        output_path = os.path.join(output_dir, output_filename)

        fig.savefig(output_path, dpi=150, bbox_inches='tight', pad_inches=0.5)

        import matplotlib.pyplot as plt
        plt.close(fig)

        print(f"[{trade_num}] Saved: {output_path}")

    print("Done!")

if __name__ == "__main__":
    main()