"""
Fetch and update company logos for PSX stocks.
Uses multiple sources:
1. Clearbit Logo API (free, based on domain)
2. Logo.dev API (free tier)
3. UI Avatars as fallback (generates letter-based logos)
"""
import sys
import asyncio
import httpx
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.supabase import get_supabase_service_client

# Known company websites for major PSX stocks
COMPANY_WEBSITES = {
    # Banks
    "HBL": "hbl.com",
    "UBL": "ubldigital.com",
    "MCB": "mcb.com.pk",
    "ABL": "abl.com",
    "MEBL": "meezanbank.com",
    "NBP": "nbp.com.pk",
    "BAFL": "bankalfalah.com",
    "BAHL": "bankalhabib.com",
    "FABL": "faysalbank.com",
    "AKBL": "askaribank.com.pk",
    "SNBL": "soneribank.com",
    "JSBL": "jsbl.com",
    "SILK": "silkbank.com.pk",
    "BIPL": "bifreholdings.com",

    # Cement
    "LUCK": "lucky-cement.com",
    "DGKC": "dgcement.com",
    "MLCF": "mapleleafcement.com",
    "FCCL": "fauji.com.pk",
    "KOHC": "kohatcement.com",
    "CHCC": "charatcement.com",
    "PIOC": "pioneercement.com",
    "ACPL": "attockcement.com",
    "BWCL": "bestway.com.pk",

    # Oil & Gas
    "OGDC": "ogdcl.com",
    "PPL": "ppl.com.pk",
    "POL": "pakoil.com.pk",
    "PSO": "psopk.com",
    "SNGP": "ssgc.com.pk",
    "SSGC": "ssgc.com.pk",
    "MARI": "mari-gas.com.pk",
    "ATRL": "attock.com",
    "APL": "attock.com",
    "NRL": "nfrpk.com",
    "BYCO": "byco.com.pk",
    "HASCOL": "hfreholdings.com",

    # Technology
    "SYS": "systemsltd.com",
    "TRG": "trg.com.pk",
    "AVN": "avanceon.com",
    "NETSOL": "netsoltech.com",

    # Telecom
    "PTC": "ptcl.com.pk",

    # Fertilizer
    "EFERT": "engrofertilizers.com",
    "FFC": "ffreholdings.com",
    "FATIMA": "fatima-group.com",
    "FFBL": "ffbl.com",

    # Power
    "HUBC": "hubpower.com",
    "KEL": "ke.com.pk",
    "KAPCO": "kapco.com.pk",
    "NPL": "nishatpower.com",
    "NCPL": "nishat.net",

    # Automobile
    "INDU": "toyota-indus.com",
    "HCAR": "honda.com.pk",
    "PSMC": "suzukipakistan.com",
    "MTL": "millat.com.pk",
    "GHNL": "gfreholdings.com",
    "AGTL": "agriautos.com",

    # Textile
    "NML": "nishatmills.com",
    "NCL": "nishat.net",
    "GATM": "gfreholdings.com",
    "ILP": "interlooppk.com",

    # Food & Beverages
    "NESTLE": "nestle.pk",
    "UNITY": "unityfoodslimited.com",
    "NATF": "nationalfoods.com",
    "FFL": "frieslandcampina.com.pk",
    "QUICE": "mitchellsfruit.com",

    # Pharma
    "SEARL": "searlecompany.com",
    "GLAXO": "pk.gsk.com",
    "FEROZ": "ffreholdings.com",
    "AGP": "agp.com.pk",
    "HINOON": "hinoonsorganic.com",

    # Real Estate
    "DCL": "dolmen.com.pk",

    # Chemicals
    "ENGRO": "engro.com",
    "ICI": "akzonobel.com",
    "LOTCHEM": "lfreholdings.com",

    # Steel
    "ISL": "ittehadsfreel.com",
    "ASTL": "amarasteel.com",
    "INIL": "internationalindustries.com",
    "MUGHAL": "mughalsteel.com.pk",

    # Insurance
    "EFUG": "efugeneral.com",
    "JSGCL": "jsgroup.com",
    "AICL": "adamjeeinsurance.com",

    # Others
    "ENGRO": "engro.com",
    "COLG": "colgate.com.pk",
    "ULEVER": "unilever.pk",
    "PAEL": "pakelectron.com",
    "WAVES": "waves.com.pk",
    "DAWH": "dawood-group.com",
}


def get_clearbit_logo_url(domain: str) -> str:
    """Get logo URL from Clearbit (free, no API key needed)."""
    return f"https://logo.clearbit.com/{domain}"


def get_ui_avatar_url(symbol: str, name: str) -> str:
    """Generate a letter-based avatar as fallback."""
    # Use first letters of company name or symbol
    initials = symbol[:2].upper()
    # Generate a consistent color based on symbol
    colors = ["0ea5e9", "8b5cf6", "ec4899", "f97316", "22c55e", "06b6d4", "6366f1", "f43f5e"]
    color_index = sum(ord(c) for c in symbol) % len(colors)
    bg_color = colors[color_index]

    return f"https://ui-avatars.com/api/?name={initials}&background={bg_color}&color=fff&size=128&bold=true&format=png"


async def check_logo_exists(client: httpx.AsyncClient, url: str) -> bool:
    """Check if a logo URL returns a valid image."""
    try:
        response = await client.head(url, timeout=5.0, follow_redirects=True)
        content_type = response.headers.get("content-type", "")
        return response.status_code == 200 and "image" in content_type
    except Exception:
        return False


async def fetch_logo_for_company(
    client: httpx.AsyncClient,
    symbol: str,
    name: str
) -> str:
    """Fetch logo URL for a company, trying multiple sources."""

    # Try Clearbit first if we have a known domain
    if symbol in COMPANY_WEBSITES:
        domain = COMPANY_WEBSITES[symbol]
        clearbit_url = get_clearbit_logo_url(domain)
        if await check_logo_exists(client, clearbit_url):
            return clearbit_url

    # Try to guess domain from company name
    guessed_domains = [
        f"{symbol.lower()}.com.pk",
        f"{symbol.lower()}.com",
        f"{name.lower().replace(' ', '')}.com.pk",
        f"{name.lower().replace(' ', '')}.com",
    ]

    for domain in guessed_domains:
        clearbit_url = get_clearbit_logo_url(domain)
        if await check_logo_exists(client, clearbit_url):
            return clearbit_url

    # Fallback to UI Avatars (always works)
    return get_ui_avatar_url(symbol, name)


async def update_company_logos():
    """Main function to fetch and update all company logos."""
    db = get_supabase_service_client()

    # Get all companies without logos or with placeholder logos
    result = db.table("companies").select("id, symbol, name, logo_url").execute()
    companies = result.data or []

    print(f"Found {len(companies)} companies to process")

    updated = 0
    skipped = 0

    async with httpx.AsyncClient() as client:
        for company in companies:
            symbol = company["symbol"]
            name = company["name"]
            current_logo = company.get("logo_url")

            # Skip if already has a non-placeholder logo
            if current_logo and "ui-avatars" not in current_logo and "placeholder" not in current_logo:
                print(f"Skipping {symbol} - already has logo")
                skipped += 1
                continue

            print(f"Fetching logo for {symbol} ({name})...", end=" ")

            try:
                logo_url = await fetch_logo_for_company(client, symbol, name)

                # Update database
                db.table("companies").update({
                    "logo_url": logo_url
                }).eq("id", company["id"]).execute()

                logo_type = "Clearbit" if "clearbit" in logo_url else "UI Avatar"
                print(f"OK ({logo_type})")
                updated += 1

            except Exception as e:
                print(f"Error: {e}")

            # Small delay to avoid rate limiting
            await asyncio.sleep(0.1)

    print(f"\nSummary: {updated} updated, {skipped} skipped")


if __name__ == "__main__":
    asyncio.run(update_company_logos())
