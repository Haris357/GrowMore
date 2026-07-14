"""
Compute derived ratios (ROE, ROA, ROCE, margins, D/E, current ratio, growth,
FCF yield) from stored financial statements and write them to the stocks table.

Run AFTER backfill_fundamentals.py (which populates financial_statements).
"""
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")

from app.services.psx.data_writer import PSXDataWriter


def main():
    writer = PSXDataWriter()
    updated = writer.compute_and_store_all_ratios()
    print(f"Ratios computed & stored for {updated} stocks")


if __name__ == "__main__":
    main()
