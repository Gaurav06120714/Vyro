"""Rate-limiting setup using SlowAPI (wraps limits library).

Usage in a router:
    from app.core.limiter import limiter
    from slowapi.errors import RateLimitExceeded

    @router.post("/build")
    @limiter.limit("10/minute")
    async def build_resume(request: Request, ...):
        ...

Register on the FastAPI app in main.py:
    from slowapi import _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    from slowapi.middleware import SlowAPIMiddleware
    from app.core.limiter import limiter

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Key function: rate-limit by client IP
# In production behind a proxy, set FORWARDED_ALLOW_IPS or trust X-Forwarded-For
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
