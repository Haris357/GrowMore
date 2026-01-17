"""
Seed all PSX stocks from the live scraper into the database.
This script fetches all stocks from PSX market watch and creates
company + stock records for each one.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.supabase import get_supabase_service_client
from app.scrapers.stocks.psx_scraper import PSXScraper, PSX_SECTOR_CODES


# Map PSX sector codes to our internal sector codes (based on actual PSX DPS codes)
PSX_CODE_TO_INTERNAL = {
    "0801": "AUTO",           # Automobile Assembler
    "0802": "AUTOPART",       # Automobile Parts & Accessories
    "0803": "ENGG",           # Cable & Electrical Goods
    "0804": "CEMENT",         # Cement
    "0805": "CHEM",           # Chemical
    "0806": "MISC",           # Close - End Mutual Fund
    "0807": "BANK",           # Commercial Banks
    "0808": "ENGG",           # Engineering
    "0809": "FERT",           # Fertilizer
    "0810": "FOOD",           # Food & Personal Care Products
    "0811": "GLASS",          # Glass & Ceramics
    "0812": "INS",            # Insurance
    "0813": "INVBANK",        # Inv. Banks / Inv. Cos. / Securities Cos.
    "0814": "MISC",           # Jute
    "0815": "MISC",           # Leasing Companies
    "0816": "LEATHER",        # Leather & Tanneries
    "0817": "MISC",           # Miscellaneous
    "0818": "MISC",           # Modarabas
    "0819": "PAPER",          # Paper & Board
    "0820": "OIL",            # Oil & Gas Exploration Companies
    "0821": "OILMKT",         # Oil & Gas Marketing Companies
    "0822": "PHARMA",         # Pharmaceuticals
    "0823": "POWER",          # Power Generation & Distribution
    "0824": "POWER",          # Power Generation (IPPs)
    "0825": "REF",            # Refinery
    "0826": "SUGAR",          # Sugar Allied Industries
    "0827": "SYNTH",          # Synthetic & Rayon
    "0828": "TECH",           # Technology & Communication
    "0829": "TEXTILE",        # Textile Composite
    "0830": "TEXSPIN",        # Textile Spinning
    "0831": "TEXWEAVE",       # Textile Weaving
    "0832": "TOBACCO",        # Tobacco
    "0833": "TRANS",          # Transport
    "0834": "MISC",           # Vanaspati & Allied Industries
    "0835": "MISC",           # Woollen
    "0836": "PROP",           # Real Estate Investment Trust
    "0837": "MISC",           # Exchange Traded Funds
    "0838": "MISC",           # Mutual Funds
}

# Fallback mapping for sector names (if code not available)
SECTOR_NAME_MAPPING = {
    "COMMERCIAL BANKS": "BANK",
    "BANK": "BANK",
    "CEMENT": "CEMENT",
    "OIL & GAS EXPLORATION": "OIL",
    "OIL & GAS EXPLORATION COMPANIES": "OIL",
    "OIL & GAS MARKETING": "OILMKT",
    "OIL & GAS MARKETING COMPANIES": "OILMKT",
    "TECHNOLOGY & COMMUNICATION": "TECH",
    "TECHNOLOGY": "TECH",
    "FERTILIZER": "FERT",
    "POWER GENERATION & DISTRIBUTION": "POWER",
    "POWER": "POWER",
    "AUTOMOBILE ASSEMBLER": "AUTO",
    "AUTOMOBILE": "AUTO",
    "AUTOMOBILE PARTS": "AUTOPART",
    "AUTO PARTS & ACCESSORIES": "AUTOPART",
    "PHARMACEUTICAL": "PHARMA",
    "PHARMACEUTICALS": "PHARMA",
    "CHEMICAL": "CHEM",
    "TEXTILE COMPOSITE": "TEXTILE",
    "TEXTILE": "TEXTILE",
    "TEXTILE SPINNING": "TEXSPIN",
    "TEXTILE WEAVING": "TEXWEAVE",
    "SUGAR": "SUGAR",
    "SUGAR ALLIED": "SUGAR",
    "SUGAR ALLIED INDUSTRIES": "SUGAR",
    "INSURANCE": "INS",
    "INVESTMENT BANKS": "INVBANK",
    "INV. BANKS / INV. COS. / SECURITIES COS.": "INVBANK",
    "ENGINEERING": "ENGG",
    "FOOD & PERSONAL CARE": "FOOD",
    "FOOD & PERSONAL CARE PRODUCTS": "FOOD",
    "PAPER & BOARD": "PAPER",
    "GLASS & CERAMICS": "GLASS",
    "LEATHER & TANNERIES": "LEATHER",
    "REFINERY": "REF",
    "TRANSPORT": "TRANS",
    "TOBACCO": "TOBACCO",
    "SYNTHETIC & RAYON": "SYNTH",
    "PROPERTY": "PROP",
    "REAL ESTATE INVESTMENT TRUST": "PROP",
    "CLOSE - END MUTUAL FUND": "MISC",
    "MISCELLANEOUS": "MISC",
    "MODARABAS": "MISC",
    "LEASING COMPANIES": "MISC",
}


def get_market_id(client):
    result = client.table("markets").select("id").eq("code", "PSX").execute()
    return result.data[0]["id"] if result.data else None


def get_sectors(client, market_id):
    result = client.table("sectors").select("id, code").eq("market_id", market_id).execute()
    return {s["code"]: s["id"] for s in result.data} if result.data else {}


def get_sector_id(stock_data, sectors):
    """Map sector from PSX to our sector code.

    First tries to use sector_code (4-digit PSX code),
    then falls back to sector name matching.
    """
    # Try sector code first (more reliable)
    sector_code = stock_data.get("sector_code")
    if sector_code and sector_code in PSX_CODE_TO_INTERNAL:
        internal_code = PSX_CODE_TO_INTERNAL[sector_code]
        if internal_code in sectors:
            return sectors[internal_code]

    # Fall back to sector name
    sector_name = stock_data.get("sector", "")
    if not sector_name:
        return sectors.get("MISC")

    sector_upper = sector_name.upper().strip()

    # Direct mapping
    if sector_upper in SECTOR_NAME_MAPPING:
        code = SECTOR_NAME_MAPPING[sector_upper]
        return sectors.get(code, sectors.get("MISC"))

    # Partial match
    for key, code in SECTOR_NAME_MAPPING.items():
        if key in sector_upper or sector_upper in key:
            return sectors.get(code, sectors.get("MISC"))

    return sectors.get("MISC")


async def seed_all_stocks():
    client = get_supabase_service_client()
    market_id = get_market_id(client)

    if not market_id:
        print("ERROR: PSX market not found. Run seed_markets.py first.")
        return

    sectors = get_sectors(client, market_id)
    if not sectors:
        print("ERROR: No sectors found. Run seed_markets.py first.")
        return

    print(f"Market ID: {market_id}")
    print(f"Found {len(sectors)} sectors")

    # Scrape all stocks from PSX
    print("\nScraping PSX market watch...")
    scraper = PSXScraper()
    stocks = await scraper.scrape()

    if not stocks:
        print("ERROR: No stocks scraped from PSX. Check internet connection.")
        return

    print(f"Scraped {len(stocks)} stocks from PSX")

    # Get existing companies
    existing = client.table("companies").select("symbol").eq("market_id", market_id).execute()
    existing_symbols = {c["symbol"] for c in existing.data} if existing.data else set()
    print(f"Found {len(existing_symbols)} existing companies in database")

    created_count = 0
    updated_count = 0
    skipped_count = 0

    for stock_data in stocks:
        symbol = stock_data.get("symbol")
        if not symbol:
            skipped_count += 1
            continue

        # Get sector from scraped data (using code or name)
        sector_id = get_sector_id(stock_data, sectors)

        if symbol in existing_symbols:
            # Update existing stock price
            try:
                company_result = client.table("companies").select("id").eq(
                    "market_id", market_id
                ).eq("symbol", symbol).execute()

                if company_result.data:
                    company_id = company_result.data[0]["id"]

                    # Update stock
                    client.table("stocks").update({
                        "current_price": float(stock_data["current_price"]) if stock_data.get("current_price") else None,
                        "change_amount": float(stock_data["change_amount"]) if stock_data.get("change_amount") else None,
                        "change_percentage": float(stock_data["change_percentage"]) if stock_data.get("change_percentage") else None,
                        "previous_close": float(stock_data["previous_close"]) if stock_data.get("previous_close") else None,
                        "volume": stock_data.get("volume"),
                    }).eq("company_id", company_id).execute()

                    updated_count += 1
            except Exception as e:
                print(f"Error updating {symbol}: {e}")
                skipped_count += 1
        else:
            # Create new company and stock
            try:
                company_data = {
                    "market_id": market_id,
                    "sector_id": sector_id,
                    "symbol": symbol,
                    "name": stock_data.get("name", symbol),
                    "is_active": True,
                }

                result = client.table("companies").insert(company_data).execute()

                if result.data:
                    company_id = result.data[0]["id"]

                    # Create stock record
                    client.table("stocks").insert({
                        "company_id": company_id,
                        "current_price": float(stock_data["current_price"]) if stock_data.get("current_price") else 0,
                        "change_amount": float(stock_data["change_amount"]) if stock_data.get("change_amount") else 0,
                        "change_percentage": float(stock_data["change_percentage"]) if stock_data.get("change_percentage") else 0,
                        "previous_close": float(stock_data["previous_close"]) if stock_data.get("previous_close") else None,
                        "volume": stock_data.get("volume", 0),
                    }).execute()

                    created_count += 1

                    if created_count % 50 == 0:
                        print(f"  Created {created_count} new companies...")

            except Exception as e:
                print(f"Error creating {symbol}: {e}")
                skipped_count += 1

    print(f"\n{'='*50}")
    print(f"Seed completed!")
    print(f"  Created: {created_count} new companies")
    print(f"  Updated: {updated_count} existing stocks")
    print(f"  Skipped: {skipped_count}")
    print(f"  Total in DB: {len(existing_symbols) + created_count}")


def main():
    print("="*50)
    print("PSX All Stocks Seeder")
    print("="*50)
    asyncio.run(seed_all_stocks())


if __name__ == "__main__":
    main()
