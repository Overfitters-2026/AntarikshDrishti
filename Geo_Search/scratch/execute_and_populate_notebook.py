import json
import base64
import io
import os
import sys
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, classification_report
import joblib

notebook_path = r"c:\Projects\PS_227\Geo_Search\train_rf_classifier.ipynb"
with open(notebook_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

# Global execution namespace
ns = {}

def capture_plot_as_png_base64():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
    plt.close()
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

code_cells = [c for c in nb["cells"] if c["cell_type"] == "code"]

# Monkeypatch plt.show to prevent early clearing
orig_show = plt.show
plt.show = lambda *args, **kwargs: None

for idx, cell in enumerate(code_cells, start=1):
    source = "".join(cell["source"])
    cell["execution_count"] = idx
    cell["outputs"] = []
    
    # Capture stdout
    stdout_buf = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = stdout_buf
    
    try:
        exec(source, ns)
    except Exception as e:
        sys.stdout = old_stdout
        print(f"Error in cell {idx}: {e}")
        raise e
    finally:
        sys.stdout = old_stdout
        
    text_out = stdout_buf.getvalue()
    if text_out:
        cell["outputs"].append({
            "name": "stdout",
            "output_type": "stream",
            "text": [line + "\n" for line in text_out.splitlines()]
        })
        print(f"--- Cell {idx} Output ---")
        print(text_out)

    # Capture figure if any exists
    if plt.get_fignums():
        img_b64 = capture_plot_as_png_base64()
        cell["outputs"].append({
            "data": {
                "image/png": img_b64,
                "text/plain": ["<Figure size ...>"]
            },
            "metadata": {},
            "output_type": "display_data"
        })


with open(notebook_path, "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=2)

print(f"\nAll notebook cells executed and saved with outputs to {notebook_path}!")
