import time
from collections import defaultdict
from dataclasses import dataclass


@dataclass
class RateLimit:
    max_requests: int
    window_seconds: int


PLATFORM_RATE_LIMITS: dict[str, RateLimit] = {
    "x": RateLimit(max_requests=300, window_seconds=10800),  # 300 per 3 hours
    "instagram": RateLimit(max_requests=25, window_seconds=86400),  # 25 per day
    "facebook": RateLimit(max_requests=200, window_seconds=3600),  # 200 per hour
    "linkedin": RateLimit(max_requests=100, window_seconds=86400),  # 100 per day
    "reddit": RateLimit(max_requests=1000, window_seconds=600),  # 1000 per 10 min
    "youtube": RateLimit(max_requests=6, window_seconds=86400),  # ~6 uploads per day (quota)
}


class RateLimiter:
    def __init__(self):
        self._requests: dict[str, list[float]] = defaultdict(list)

    def can_make_request(self, platform: str, org_id: str) -> bool:
        limit = PLATFORM_RATE_LIMITS.get(platform)
        if not limit:
            return True

        key = f"{org_id}:{platform}"
        now = time.time()
        cutoff = now - limit.window_seconds

        # Clean old entries
        self._requests[key] = [t for t in self._requests[key] if t > cutoff]

        return len(self._requests[key]) < limit.max_requests

    def record_request(self, platform: str, org_id: str):
        key = f"{org_id}:{platform}"
        self._requests[key].append(time.time())

    def remaining_requests(self, platform: str, org_id: str) -> int:
        limit = PLATFORM_RATE_LIMITS.get(platform)
        if not limit:
            return 999

        key = f"{org_id}:{platform}"
        now = time.time()
        cutoff = now - limit.window_seconds
        current = len([t for t in self._requests.get(key, []) if t > cutoff])

        return max(0, limit.max_requests - current)


rate_limiter = RateLimiter()
