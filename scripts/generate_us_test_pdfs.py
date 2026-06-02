#!/usr/bin/env python3
"""Regenerate US test PDFs (realistic layout)."""
import subprocess
import sys
from pathlib import Path

def main() -> None:
    script = Path(__file__).resolve().parent / "generate_realistic_us_notices.py"
    subprocess.check_call([sys.executable, str(script)])

if __name__ == "__main__":
    main()
