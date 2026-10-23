"""Production entry point. Listening/recording preview; paid assessment stays disabled."""
import os
from app import create_app

if not os.environ.get('SECRET_KEY') or len(os.environ['SECRET_KEY']) < 32:
    raise RuntimeError('Set SECRET_KEY to a random server secret of at least 32 characters.')

app = create_app({
    'SESSION_COOKIE_SECURE': True,
    # Keep external paid API unavailable until account access and usage limits exist.
    'ENABLE_PRONUNCIATION': False,
})
