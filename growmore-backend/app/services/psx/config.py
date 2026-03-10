"""
PSX data service configuration — API URLs, rate limits, cache TTLs.
"""

# Rate limits
PSX_API_RATE_LIMIT = 100  # requests per minute (PSX Terminal)
PSX_WS_MAX_CONNECTIONS = 5
PSX_WS_MAX_SUBSCRIPTIONS = 20  # per connection
PSX_WS_HEARTBEAT_INTERVAL = 30  # seconds

# Cache TTLs (seconds)
CACHE_TTL_TICKS = 15
CACHE_TTL_FUNDAMENTALS = 300       # 5 minutes
CACHE_TTL_SYMBOLS = 3600           # 1 hour
CACHE_TTL_FINANCIALS = 86400       # 24 hours
CACHE_TTL_COMPANY_INFO = 86400     # 24 hours
CACHE_TTL_KLINES = 60              # 1 minute
CACHE_TTL_SECTORS = 3600           # 1 hour
CACHE_TTL_MARKET_STATS = 15        # 15 seconds
CACHE_TTL_DIVIDENDS = 86400        # 24 hours

# PSX Terminal market types
MARKET_TYPE_REG = "REG"
MARKET_TYPE_FUT = "FUT"
MARKET_TYPE_IDX = "IDX"

# Kline timeframes
VALID_TIMEFRAMES = ("1m", "5m", "15m", "1h", "4h", "1d")

# Batch sizes for bulk operations
FUNDAMENTALS_BATCH_SIZE = 10       # concurrent requests within rate limit
DPS_COMPANY_BATCH_SIZE = 5         # concurrent DPS requests (be gentler)
DPS_COMPANY_BATCH_DELAY = 1.0      # seconds between DPS batches

# History backfill
HISTORY_BACKFILL_MONTHS = 24       # default months to backfill (2 years)
HISTORY_BATCH_SIZE = 5             # concurrent symbol fetches for history
HISTORY_BATCH_DELAY = 1.0          # seconds between history batches
