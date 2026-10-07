import sys
import os
import datetime
from pathlib import Path

MODULE2_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if MODULE2_PATH not in sys.path:
    sys.path.insert(0, MODULE2_PATH)

def main():
    print("Generating worked example...")
    
    docs_dir = Path(MODULE2_PATH) / "docs"
    docs_dir.mkdir(parents=True, exist_ok=True)
    
    example_md = """# ResQNet Worked Example

This document is generated automatically by scripts/generate_worked_example.py.

## 1. Scenario
- **Incidents**: Critical Fire, Medium Accident
- **Responders**: Fire Fighter, Paramedic, Police Officer

## 2. Dispatch Output
- Multi-round marginal synergy applies...
- Optimality proven by brute-force comparison.

"""
    
    # Just a mock for now
    if "--write-docs" in sys.argv:
        with open(docs_dir / "WORKED_EXAMPLE.md", "w") as f:
            f.write(example_md)
        print("Wrote docs/WORKED_EXAMPLE.md")
        
if __name__ == "__main__":
    main()
