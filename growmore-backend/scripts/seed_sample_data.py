import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.supabase import get_supabase_service_client


def get_market_id():
    client = get_supabase_service_client()
    result = client.table("markets").select("id").eq("code", "PSX").execute()
    return result.data[0]["id"] if result.data else None


def seed_companies():
    client = get_supabase_service_client()
    market_id = get_market_id()

    if not market_id:
        print("Market not found. Run seed_markets.py first.")
        return

    bank_sector = client.table("sectors").select("id").eq("market_id", market_id).eq("code", "BANK").execute()
    bank_sector_id = bank_sector.data[0]["id"] if bank_sector.data else None

    cement_sector = client.table("sectors").select("id").eq("market_id", market_id).eq("code", "CEMENT").execute()
    cement_sector_id = cement_sector.data[0]["id"] if cement_sector.data else None

    oil_sector = client.table("sectors").select("id").eq("market_id", market_id).eq("code", "OIL").execute()
    oil_sector_id = oil_sector.data[0]["id"] if oil_sector.data else None

    tech_sector = client.table("sectors").select("id").eq("market_id", market_id).eq("code", "TECH").execute()
    tech_sector_id = tech_sector.data[0]["id"] if tech_sector.data else None

    companies = [
        {"symbol": "HBL", "name": "Habib Bank Limited", "sector_id": bank_sector_id},
        {"symbol": "UBL", "name": "United Bank Limited", "sector_id": bank_sector_id},
        {"symbol": "MCB", "name": "MCB Bank Limited", "sector_id": bank_sector_id},
        {"symbol": "ABL", "name": "Allied Bank Limited", "sector_id": bank_sector_id},
        {"symbol": "MEBL", "name": "Meezan Bank Limited", "sector_id": bank_sector_id},
        {"symbol": "LUCK", "name": "Lucky Cement Limited", "sector_id": cement_sector_id},
        {"symbol": "DGKC", "name": "D.G. Khan Cement Company Limited", "sector_id": cement_sector_id},
        {"symbol": "MLCF", "name": "Maple Leaf Cement Factory Limited", "sector_id": cement_sector_id},
        {"symbol": "OGDC", "name": "Oil & Gas Development Company Limited", "sector_id": oil_sector_id},
        {"symbol": "PPL", "name": "Pakistan Petroleum Limited", "sector_id": oil_sector_id},
        {"symbol": "POL", "name": "Pakistan Oilfields Limited", "sector_id": oil_sector_id},
        {"symbol": "SYS", "name": "Systems Limited", "sector_id": tech_sector_id},
        {"symbol": "TRG", "name": "TRG Pakistan Limited", "sector_id": tech_sector_id},
    ]

    for company in companies:
        company["market_id"] = market_id
        company["is_active"] = True

        existing = client.table("companies").select("id").eq("market_id", market_id).eq("symbol", company["symbol"]).execute()
        if not existing.data:
            result = client.table("companies").insert(company).execute()
            company_id = result.data[0]["id"]

            client.table("stocks").insert({
                "company_id": company_id,
                "current_price": 100.0,
                "change_amount": 0,
                "change_percentage": 0,
                "volume": 0,
            }).execute()

            print(f"Created company and stock: {company['name']}")
        else:
            print(f"Company already exists: {company['name']}")


def seed_commodities():
    client = get_supabase_service_client()
    market_id = get_market_id()

    if not market_id:
        print("Market not found. Run seed_markets.py first.")
        return

    commodity_types = client.table("commodity_types").select("id, name").execute().data
    type_map = {t["name"]: t["id"] for t in commodity_types}

    commodities = [
        {"type": "Gold 24K", "name": "Gold 24K (Per Tola)", "price_per_unit": "per tola"},
        {"type": "Gold 24K", "name": "Gold 24K (Per 10 Grams)", "price_per_unit": "per 10 grams"},
        {"type": "Gold 22K", "name": "Gold 22K (Per Tola)", "price_per_unit": "per tola"},
        {"type": "Gold 22K", "name": "Gold 22K (Per 10 Grams)", "price_per_unit": "per 10 grams"},
        {"type": "Silver", "name": "Silver (Per Tola)", "price_per_unit": "per tola"},
        {"type": "Silver", "name": "Silver (Per 10 Grams)", "price_per_unit": "per 10 grams"},
    ]

    for commodity in commodities:
        type_id = type_map.get(commodity.pop("type"))

        if not type_id:
            continue

        commodity["market_id"] = market_id
        commodity["commodity_type_id"] = type_id

        existing = client.table("commodities").select("id").eq("market_id", market_id).eq("name", commodity["name"]).execute()
        if not existing.data:
            client.table("commodities").insert(commodity).execute()
            print(f"Created commodity: {commodity['name']}")
        else:
            print(f"Commodity already exists: {commodity['name']}")


def main():
    print("Starting sample data seed...")

    print("\nSeeding companies...")
    seed_companies()

    print("\nSeeding commodities...")
    seed_commodities()

    print("\nSample data seed completed!")


if __name__ == "__main__":
    main()
