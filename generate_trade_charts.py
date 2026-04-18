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

    # 2. Setup Plotting Style (Red/Green Candles)
    # 'up' = close > open (Green), 'down' = close < open (Red)
    mc = mpf.make_marketcolors(up='g', down='r', edge='i', wick='i', volume='in')
    s  = mpf.make_mpf_style(marketcolors=mc, gridstyle=':', y_on_right=False)

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

        # 3. Determine Output Directory (e.g., trade_charts/2015/April/)
        year_str = entry_date.strftime('%Y')
        month_str = entry_date.strftime('%B') # Full month name (e.g., December)
        output_dir = os.path.join(OUTPUT_BASE_DIR, year_str, month_str)
        os.makedirs(output_dir, exist_ok=True)

        # 4. Load Price Data
        price_file = os.path.join(PRICE_DATA_DIR, f"{ticker}.csv")
        if not os.path.exists(price_file):
            print(f"[{trade_num}] Skipping {ticker}: Price file not found at {price_file}")
            continue

        # Read price CSV, handling the weird row 2 header issue in yfinance data
        df_price = pd.read_csv(price_file, parse_dates=['Date'], index_col='Date')
        df_price = df_price[df_price.index.notna()] # Drop rows where Date is NaN (the garbage header row)
        
        # Ensure required columns exist
        required_cols = ['Open', 'High', 'Low', 'Close', 'Volume']
        if not all(col in df_price.columns for col in required_cols):
            print(f"[{trade_num}] Skipping {ticker}: Missing OHLCV columns.")
            continue

        # 5. Handle Weekends/Holidays (Entry date might not be in trading data)
        if entry_date not in df_price.index:
            # Find the next valid trading day on or after the entry date
            valid_dates = df_price.index[df_price.index >= entry_date]
            if len(valid_dates) == 0:
                print(f"[{trade_num}] Skipping {ticker}: Entry date is beyond available price data.")
                continue
            entry_date = valid_dates[0]

        # 6. Slice Data (20 days before and 20 days after)
        entry_idx = df_price.index.get_loc(entry_date)
        start_idx = max(0, entry_idx - DAYS_BEFORE)
        end_idx = min(len(df_price) - 1, entry_idx + DAYS_AFTER)

        chart_df = df_price.iloc[start_idx:end_idx + 1].copy()

        if len(chart_df) < 2:
            print(f"[{trade_num}] Skipping {ticker}: Not enough price data around entry.")
            continue

        # 7. Prepare Annotations (Entry, SL, TP Lines)
        entry_price = row['Entry_Price']
        sl_price = row['SL']
        tp_price = row['TP']

        hlines_dict = []
        # Only draw SL/TP if they are somewhat reasonable compared to the chart data
        price_min = chart_df['Low'].min()
        price_max = chart_df['High'].max()
        padding = (price_max - price_min) * 0.5

        if price_min - padding < entry_price < price_max + padding:
            hlines_dict.append(dict(hlines=[entry_price], colors=['blue'], linewidths=1.5, linestyle='--'))
        if price_min - padding < sl_price < price_max + padding:
            hlines_dict.append(dict(hlines=[sl_price], colors=['red'], linewidths=1.2, linestyle='-.'))
        if price_min - padding < tp_price < price_max + padding:
            hlines_dict.append(dict(hlines=[tp_price], colors=['green'], linewidths=1.2, linestyle='-.'))

        # Vertical line for Entry Day
        vlines_dict = dict(vlines=[entry_date], colors=['purple'], linewidths=1.5, linestyle='-')

        # 8. Build Metrics Text Box
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

        # 9. Generate Plot
        fig, axes = mpf.plot(
            chart_df,
            type='candle',
            style=s,
            volume=True,
            title=f"\n{ticker} | Trade #{trade_num} | {entry_date_str}",
            hlines=hlines_dict if hlines_dict else None,
            vlines=vlines_dict,
            returnfig=True
        )

        # Add text box to the figure
        fig.text(0.02, 0.95, metrics_text, fontsize=9,
                 verticalalignment='top',
                 fontfamily='monospace',
                 bbox=dict(boxstyle='round,pad=0.5', facecolor='white', alpha=0.8, edgecolor='gray'))

        # 10. Save Image
        output_filename = f"{trade_num}_{ticker}_{entry_date_str}.png"
        output_path = os.path.join(output_dir, output_filename)
        
        # bbox_inches='tight' prevents text from being cut off
        fig.savefig(output_path, dpi=150, bbox_inches='tight', pad_inches=0.5)
        
        # Close figure to free memory
        import matplotlib.pyplot as plt
        plt.close(fig)
        
        print(f"[{trade_num}] Saved: {output_path}")

    print("Done!")

if __name__ == "__main__":
    main()