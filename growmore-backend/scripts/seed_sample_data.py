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


def seed_banks():
    client = get_supabase_service_client()
    market_id = get_market_id()

    if not market_id:
        print("Market not found. Run seed_markets.py first.")
        return

    banks = [
        {"code": "HBL", "name": "Habib Bank Limited", "website": "https://www.hbl.com"},
        {"code": "UBL", "name": "United Bank Limited", "website": "https://www.ubldigital.com"},
        {"code": "MCB", "name": "MCB Bank Limited", "website": "https://www.mcb.com.pk"},
        {"code": "ABL", "name": "Allied Bank Limited", "website": "https://www.abl.com"},
        {"code": "NBP", "name": "National Bank of Pakistan", "website": "https://www.nbp.com.pk"},
        {"code": "BAFL", "name": "Bank Alfalah Limited", "website": "https://www.bankalfalah.com"},
        {"code": "MEBL", "name": "Meezan Bank Limited", "website": "https://www.meezanbank.com"},
        {"code": "BAHL", "name": "Bank Al-Habib Limited", "website": "https://www.bankalhabib.com"},
        {"code": "FABL", "name": "Faysal Bank Limited", "website": "https://www.faysalbank.com"},
        {"code": "AKBL", "name": "Askari Bank Limited", "website": "https://www.askaribank.com.pk"},
    ]

    for bank in banks:
        bank["market_id"] = market_id
        bank["is_active"] = True

        existing = client.table("banks").select("id").eq("market_id", market_id).eq("code", bank["code"]).execute()
        if not existing.data:
            client.table("banks").insert(bank).execute()
            print(f"Created bank: {bank['name']}")
        else:
            print(f"Bank already exists: {bank['name']}")


def seed_bank_products():
    client = get_supabase_service_client()

    banks = client.table("banks").select("id, code").execute().data
    product_types = client.table("bank_product_types").select("id, name").execute().data

    if not banks or not product_types:
        print("Banks or product types not found. Run seed scripts first.")
        return

    bank_map = {b["code"]: b["id"] for b in banks}
    type_map = {t["name"]: t["id"] for t in product_types}

    products = [
        {
            "bank_code": "HBL",
            "product_type": "Savings Account",
            "name": "HBL ValuePlus Savings",
            "interest_rate": 14.5,
            "min_deposit": 5000,
        },
        {
            "bank_code": "HBL",
            "product_type": "Fixed Deposit",
            "name": "HBL Term Deposit",
            "interest_rate": 18.0,
            "min_deposit": 25000,
            "tenure_min_days": 30,
            "tenure_max_days": 365,
        },
        {
            "bank_code": "MEBL",
            "product_type": "Islamic Savings",
            "name": "Meezan Bachat Account",
            "interest_rate": 13.5,
            "min_deposit": 1000,
        },
        {
            "bank_code": "MEBL",
            "product_type": "Islamic Term Deposit",
            "name": "Meezan Term Deposit",
            "interest_rate": 17.5,
            "min_deposit": 10000,
            "tenure_min_days": 30,
            "tenure_max_days": 365,
        },
        {
            "bank_code": "UBL",
            "product_type": "Savings Account",
            "name": "UBL Star Saver",
            "interest_rate": 15.0,
            "min_deposit": 10000,
        },
    ]

    for product in products:
        bank_id = bank_map.get(product.pop("bank_code"))
        type_id = type_map.get(product.pop("product_type"))

        if not bank_id or not type_id:
            continue

        product["bank_id"] = bank_id
        product["product_type_id"] = type_id
        product["is_active"] = True

        existing = client.table("bank_products").select("id").eq("bank_id", bank_id).eq("name", product["name"]).execute()
        if not existing.data:
            client.table("bank_products").insert(product).execute()
            print(f"Created bank product: {product['name']}")
        else:
            print(f"Bank product already exists: {product['name']}")


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

    print("\nSeeding banks...")
    seed_banks()

    print("\nSeeding bank products...")
    seed_bank_products()

    print("\nSeeding commodities...")
    seed_commodities()

    print("\nSample data seed completed!")


if __name__ == "__main__":
    main()
