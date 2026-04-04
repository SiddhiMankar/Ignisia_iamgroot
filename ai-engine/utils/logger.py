import logging
import sys


def get_logger(name: str) -> logging.Logger:
    """
    Returns a named logger configured for console output.
    Writes to stdout (same stream as print) with UTF-8 encoding to avoid
    CP1252 UnicodeEncodeError on Windows and interleaving with print statements.
    """
    logger = logging.getLogger(name)

    if not logger.handlers:
        logger.setLevel(logging.DEBUG)
        logger.propagate = False  # Don't bubble up to root logger

        # Use a UTF-8 TextIOWrapper so Unicode chars (→, ─, ₂) never crash
        import io
        utf8_stdout = io.TextIOWrapper(
            sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True
        ) if hasattr(sys.stdout, 'buffer') else sys.stdout

        handler = logging.StreamHandler(utf8_stdout)
        handler.setLevel(logging.DEBUG)

        formatter = logging.Formatter(
            fmt="[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger
