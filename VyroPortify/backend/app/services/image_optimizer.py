"""Image optimization service.

Compresses uploaded images to WebP before storing in S3.
Falls back gracefully if Pillow is not installed.

Usage:
    from app.services.image_optimizer import optimize_image_to_webp

    webp_bytes, content_type = optimize_image_to_webp(raw_bytes, max_size=(800, 800))
"""

from __future__ import annotations

import io
import logging

logger = logging.getLogger(__name__)

# Max dimensions for profile photos
PROFILE_MAX_PX = (800, 800)
# WebP quality (0-100). 82 is visually lossless for most photos.
WEBP_QUALITY = 82


def optimize_image_to_webp(
    data: bytes,
    max_size: tuple[int, int] = PROFILE_MAX_PX,
    quality: int = WEBP_QUALITY,
) -> tuple[bytes, str]:
    """Convert *data* to a WebP image, resizing if larger than *max_size*.

    Returns:
        (webp_bytes, "image/webp")

    Falls back to the original bytes + detected content_type on any error.
    """
    try:
        from PIL import Image, UnidentifiedImageError  # type: ignore

        img = Image.open(io.BytesIO(data))

        # Strip EXIF / private metadata
        img_data = img.getdata()
        clean = Image.new(img.mode, img.size)
        clean.putdata(img_data)  # type: ignore[arg-type]

        # Resize proportionally if too large
        clean.thumbnail(max_size, Image.LANCZOS)  # type: ignore[attr-defined]

        # Convert palette / RGBA to RGB for WebP
        if clean.mode in ("P", "RGBA"):
            bg = Image.new("RGB", clean.size, (255, 255, 255))
            if clean.mode == "RGBA":
                bg.paste(clean, mask=clean.split()[3])
            else:
                bg.paste(clean)
            clean = bg
        elif clean.mode != "RGB":
            clean = clean.convert("RGB")

        buf = io.BytesIO()
        clean.save(buf, format="WEBP", quality=quality, method=6)
        webp_bytes = buf.getvalue()

        original_kb = len(data) / 1024
        optimized_kb = len(webp_bytes) / 1024
        logger.info(
            "Image optimized: %.1f KB → %.1f KB (%.0f%% saving)",
            original_kb,
            optimized_kb,
            max(0, (1 - optimized_kb / original_kb) * 100),
        )
        return webp_bytes, "image/webp"

    except ImportError:
        logger.warning("Pillow not installed — skipping image optimization")
        return data, "application/octet-stream"
    except Exception as exc:
        logger.warning("Image optimization failed: %s — using original", exc)
        return data, "application/octet-stream"
