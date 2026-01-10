HOLDING_TYPES = ["stock", "commodity", "bank_product"]

TRANSACTION_TYPES = ["buy", "sell"]

SENTIMENT_LABELS = ["positive", "negative", "neutral"]

ENTITY_TYPES = ["stock", "commodity", "bank", "sector"]

ALERT_TYPES = [
    "price_above",
    "price_below",
    "change_percentage",
    "volume_spike",
    "news_mention",
]

NEWS_CATEGORIES = [
    "stocks",
    "commodities",
    "banking",
    "economy",
    "policy",
    "currency",
    "trade",
    "energy",
    "technology",
    "real_estate",
]

COMMODITY_CATEGORIES = [
    "gold",
    "silver",
    "oil",
    "other",
]

GOLD_TYPES = [
    "Gold 24K",
    "Gold 22K",
    "Gold 21K",
    "Gold 18K",
]

BANK_PRODUCT_CATEGORIES = [
    "savings",
    "fixed_deposit",
    "current",
    "certificate",
    "investment",
]

PSX_SECTORS = [
    "Automobile Assembler",
    "Automobile Parts & Accessories",
    "Banks",
    "Cement",
    "Chemical",
    "Close - Loss",
    "Commercial Banks",
    "Engineering",
    "Fertilizer",
    "Food & Personal Care Products",
    "Glass & Ceramics",
    "Insurance",
    "Investment Banks",
    "Jute",
    "Leasing Companies",
    "Leather & Tanneries",
    "Miscellaneous",
    "Modarabas",
    "Oil & Gas Exploration Companies",
    "Oil & Gas Marketing Companies",
    "Paper & Board",
    "Pharmaceuticals",
    "Power Generation & Distribution",
    "Property",
    "Refinery",
    "Sugar Allied Industries",
    "Synthetic & Rayon",
    "Technology & Communication",
    "Textile Composite",
    "Textile Spinning",
    "Textile Weaving",
    "Tobacco",
    "Transport",
    "Vanaspati & Allied Industries",
    "Woollen",
]

PAKISTAN_BANKS = [
    {"code": "HBL", "name": "Habib Bank Limited"},
    {"code": "UBL", "name": "United Bank Limited"},
    {"code": "MCB", "name": "MCB Bank Limited"},
    {"code": "ABL", "name": "Allied Bank Limited"},
    {"code": "NBP", "name": "National Bank of Pakistan"},
    {"code": "BAFL", "name": "Bank Alfalah Limited"},
    {"code": "MEBL", "name": "Meezan Bank Limited"},
    {"code": "BAHL", "name": "Bank Al-Habib Limited"},
    {"code": "FABL", "name": "Faysal Bank Limited"},
    {"code": "AKBL", "name": "Askari Bank Limited"},
    {"code": "JSBL", "name": "JS Bank Limited"},
    {"code": "SNBL", "name": "Soneri Bank Limited"},
    {"code": "BOK", "name": "Bank of Khyber"},
    {"code": "BOP", "name": "Bank of Punjab"},
    {"code": "SCB", "name": "Standard Chartered Bank Pakistan"},
]

TIME_PERIODS = {
    "1W": 7,
    "1M": 30,
    "3M": 90,
    "6M": 180,
    "1Y": 365,
    "5Y": 1825,
}

API_RATE_LIMITS = {
    "default": 60,
    "authenticated": 120,
    "premium": 300,
}

CACHE_TTL = {
    "stock_prices": 300,
    "commodity_prices": 300,
    "news_list": 180,
    "market_overview": 600,
    "user_profile": 3600,
}

ERROR_MESSAGES = {
    "unauthorized": "Authentication required",
    "forbidden": "You don't have permission to perform this action",
    "not_found": "Resource not found",
    "validation_error": "Invalid input data",
    "internal_error": "An unexpected error occurred",
    "rate_limit": "Too many requests. Please try again later",
    "service_unavailable": "Service temporarily unavailable",
}
