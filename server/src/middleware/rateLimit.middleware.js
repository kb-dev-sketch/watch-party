const buckets = new Map();

export const rateLimit = ({ windowMs, max, message }) => (req, res, next) => {
  const now = Date.now();
  const key = `${req.baseUrl}${req.path}:${req.ip}`;
  let bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  res.setHeader("RateLimit-Limit", max);
  res.setHeader("RateLimit-Remaining", Math.max(0, max - bucket.count));
  res.setHeader("RateLimit-Reset", Math.ceil(bucket.resetAt / 1000));
  if (bucket.count > max) {
    res.setHeader("Retry-After", Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)));
    return res.status(429).json({ success: false, message });
  }
  return next();
};

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (now >= bucket.resetAt) buckets.delete(key);
}, 60_000);
cleanupInterval.unref();
