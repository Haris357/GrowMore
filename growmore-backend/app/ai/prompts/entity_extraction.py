"""
Entity Extraction Prompts for News Analysis.
"""

ENTITY_EXTRACTION_PROMPT = """
Analyze this news article and extract all mentioned entities relevant to investments.

Article Title: {title}
Article Content: {content}

Extract and return a JSON object with these categories:

{{
    "companies": [
        {{"name": "company name", "ticker": "stock symbol if mentioned", "confidence": 0.0-1.0}}
    ],
    "commodities": [
        {{"type": "gold/silver/oil/etc", "mention_context": "brief context", "confidence": 0.0-1.0}}
    ],
    "sectors": [
        {{"name": "banking/technology/etc", "confidence": 0.0-1.0}}
    ],
    "events": [
        {{"type": "merger/ipo/earnings/dividend/policy_change/etc", "description": "brief description", "confidence": 0.0-1.0}}
    ],
    "locations": [
        {{"name": "Pakistan/USA/etc", "relevance": "market/company_hq/event_location"}}
    ],
    "people": [
        {{"name": "person name", "role": "CEO/Minister/Analyst/etc", "organization": "if known"}}
    ],
    "financial_metrics": [
        {{"metric": "revenue/profit/price/etc", "value": "if mentioned", "change": "increase/decrease/stable"}}
    ],
    "currencies": [
        {{"code": "PKR/USD/etc", "context": "exchange rate/transaction/etc"}}
    ]
}}

Focus on extracting entities that are:
1. Directly mentioned in the article
2. Relevant to investment decisions
3. Specific and identifiable

Return ONLY the JSON object, no additional text.
"""

ENTITY_LINKING_PROMPT = """
Given these extracted entities from a news article, match them to known database entities.

Extracted Entities:
{entities}

Known Companies in Database:
{known_companies}

Known Sectors:
{known_sectors}

Known Commodity Types:
{known_commodities}

Return a JSON object mapping extracted entities to database IDs:

{{
    "company_matches": [
        {{"extracted_name": "name from article", "db_id": "uuid or null", "db_name": "matched name", "confidence": 0.0-1.0}}
    ],
    "sector_matches": [
        {{"extracted_name": "sector name", "db_id": "uuid or null", "db_code": "sector code", "confidence": 0.0-1.0}}
    ],
    "commodity_matches": [
        {{"extracted_type": "commodity type", "db_id": "uuid or null", "db_name": "commodity name", "confidence": 0.0-1.0}}
    ]
}}

Return ONLY the JSON object.
"""
