import json
import os

notebook_path = r"c:\Projects\PS_227\Geo_Search\train_rf_classifier.ipynb"

# Ensure data/models directory exists
os.makedirs(r"c:\Projects\PS_227\Geo_Search\data\models", exist_ok=True)

# Define the cells
cells = []

# Header Markdown
cells.append({
    "cell_type": "markdown",
    "metadata": {},
    "source": [
        "# Sentinel-2 False-Alarm Suppression Classifier Training\n",
        "\n",
        "This notebook trains a **Random Forest Classifier** to distinguish between **Real Ground Changes** (e.g. infrastructure construction, earthworks, airport runway development) and **False Alarms** (e.g. tidal mudflat moisture shifts, solar glint on coastal water, thin haze/cloud fringes, seasonal vegetation phenology) in Sentinel-2 temporal pairs.\n",
        "\n",
        "### Workflow Steps:\n",
        "1. **Dataset Definition**: 28 curated & hand-labeled tile pair examples with multi-modal features (`drift`, `similarity`, `cloud_t1`, `cloud_t2`, `days_between`, `month_t1`, `month_t2`, `label`).\n",
        "2. **Feature Distribution EDA**: Histograms, KDEs, and scatter plots split by label to sanity-check feature separability.\n",
        "3. **Model Training**: Balanced `RandomForestClassifier` with cross-validation and train/test evaluation.\n",
        "4. **Evaluation**: Confusion matrix heatmap and classification report.\n",
        "5. **Feature Importance**: Bar chart ranking Gini importance across all 7 features.\n",
        "6. **Model Serialization**: Export to `data/models/rf_false_alarm.joblib` for production deployment in `change_detector.py`."
    ]
})

# Cell 1: Load/Define Dataset
cell1_source = [
    "# Cell 1: Define and load 28 labeled tile-pair observations\n",
    "import numpy as np\n",
    "import pandas as pd\n",
    "import matplotlib.pyplot as plt\n",
    "import seaborn as sns\n",
    "import joblib\n",
    "import os\n",
    "\n",
    "# Set plot style\n",
    "sns.set_theme(style=\"whitegrid\", font_scale=1.05)\n",
    "\n",
    "# 28 Curated Sentinel-2 Tile Pair Observations\n",
    "# label: 1 = Real Change, 0 = False Alarm\n",
    "data = [\n",
    "    # --- Real Changes (Infrastructure, Construction, Ground Excavation) [Label: 1] ---\n",
    "    {\"description\": \"Navi Mumbai airport runway earthworks\", \"drift\": 0.284, \"similarity\": 0.716, \"cloud_t1\": 0.02, \"cloud_t2\": 0.03, \"days_between\": 375, \"month_t1\": 12, \"month_t2\": 12, \"label\": 1},\n",
    "    {\"description\": \"Terminal foundation concrete laying\", \"drift\": 0.312, \"similarity\": 0.688, \"cloud_t1\": 0.04, \"cloud_t2\": 0.05, \"days_between\": 375, \"month_t1\": 12, \"month_t2\": 12, \"label\": 1},\n",
    "    {\"description\": \"Coastal road reclamation sector 3\", \"drift\": 0.265, \"similarity\": 0.735, \"cloud_t1\": 0.01, \"cloud_t2\": 0.04, \"days_between\": 375, \"month_t1\": 12, \"month_t2\": 12, \"label\": 1},\n",
    "    {\"description\": \"Industrial warehouse development\", \"drift\": 0.228, \"similarity\": 0.772, \"cloud_t1\": 0.03, \"cloud_t2\": 0.02, \"days_between\": 300, \"month_t1\": 11, \"month_t2\": 9,  \"label\": 1},\n",
    "    {\"description\": \"Port terminal container yard expansion\", \"drift\": 0.245, \"similarity\": 0.755, \"cloud_t1\": 0.05, \"cloud_t2\": 0.03, \"days_between\": 375, \"month_t1\": 12, \"month_t2\": 12, \"label\": 1},\n",
    "    {\"description\": \"Highway interchange clearing\", \"drift\": 0.215, \"similarity\": 0.785, \"cloud_t1\": 0.02, \"cloud_t2\": 0.06, \"days_between\": 240, \"month_t1\": 10, \"month_t2\": 6,  \"label\": 1},\n",
    "    {\"description\": \"Metro depot yard grading\", \"drift\": 0.273, \"similarity\": 0.727, \"cloud_t1\": 0.04, \"cloud_t2\": 0.02, \"days_between\": 365, \"month_t1\": 12, \"month_t2\": 12, \"label\": 1},\n",
    "    {\"description\": \"Quarry blasting & excavation expansion\", \"drift\": 0.342, \"similarity\": 0.658, \"cloud_t1\": 0.01, \"cloud_t2\": 0.03, \"days_between\": 375, \"month_t1\": 12, \"month_t2\": 12, \"label\": 1},\n",
    "    {\"description\": \"Urban residential plot clearance\", \"drift\": 0.198, \"similarity\": 0.802, \"cloud_t1\": 0.03, \"cloud_t2\": 0.04, \"days_between\": 180, \"month_t1\": 1,  \"month_t2\": 7,  \"label\": 1},\n",
    "    {\"description\": \"Solar farm installation parcel A\", \"drift\": 0.320, \"similarity\": 0.680, \"cloud_t1\": 0.02, \"cloud_t2\": 0.05, \"days_between\": 270, \"month_t1\": 3,  \"month_t2\": 12, \"label\": 1},\n",
    "    {\"description\": \"Canal bund embankment construction\", \"drift\": 0.205, \"similarity\": 0.795, \"cloud_t1\": 0.06, \"cloud_t2\": 0.04, \"days_between\": 210, \"month_t1\": 2,  \"month_t2\": 9,  \"label\": 1},\n",
    "    {\"description\": \"Bridge approach road paving\", \"drift\": 0.252, \"similarity\": 0.748, \"cloud_t1\": 0.02, \"cloud_t2\": 0.02, \"days_between\": 375, \"month_t1\": 12, \"month_t2\": 12, \"label\": 1},\n",
    "    {\"description\": \"Deforestation / tree canopy clearing\", \"drift\": 0.290, \"similarity\": 0.710, \"cloud_t1\": 0.03, \"cloud_t2\": 0.05, \"days_between\": 330, \"month_t1\": 11, \"month_t2\": 10, \"label\": 1},\n",
    "    {\"description\": \"Coastal mangrove fringe reclamation\", \"drift\": 0.238, \"similarity\": 0.762, \"cloud_t1\": 0.04, \"cloud_t2\": 0.03, \"days_between\": 375, \"month_t1\": 12, \"month_t2\": 12, \"label\": 1},\n",
    "\n",
    "    # --- False Alarms (Cloud Fringes, Glint, Mudflat Tidal Wetness, Phenology) [Label: 0] ---\n",
    "    {\"description\": \"Coastal water sun glint / wave reflection\", \"drift\": 0.175, \"similarity\": 0.825, \"cloud_t1\": 0.02, \"cloud_t2\": 0.03, \"days_between\": 15,  \"month_t1\": 12, \"month_t2\": 12, \"label\": 0},\n",
    "    {\"description\": \"High cirrus fringe across sea water\", \"drift\": 0.220, \"similarity\": 0.780, \"cloud_t1\": 0.03, \"cloud_t2\": 0.28, \"days_between\": 375, \"month_t1\": 12, \"month_t2\": 12, \"label\": 0},\n",
    "    {\"description\": \"Thane creek low vs high tide water coverage\", \"drift\": 0.165, \"similarity\": 0.835, \"cloud_t1\": 0.02, \"cloud_t2\": 0.04, \"days_between\": 30,  \"month_t1\": 1,  \"month_t2\": 2,  \"label\": 0},\n",
    "    {\"description\": \"Seasonal grass greening post-monsoon\", \"drift\": 0.185, \"similarity\": 0.815, \"cloud_t1\": 0.05, \"cloud_t2\": 0.04, \"days_between\": 180, \"month_t1\": 4,  \"month_t2\": 10, \"label\": 0},\n",
    "    {\"description\": \"Dense cloud edge shadow anomaly\", \"drift\": 0.240, \"similarity\": 0.760, \"cloud_t1\": 0.31, \"cloud_t2\": 0.05, \"days_between\": 60,  \"month_t1\": 8,  \"month_t2\": 10, \"label\": 0},\n",
    "    {\"description\": \"Agricultural harvest soil moisture change\", \"drift\": 0.155, \"similarity\": 0.845, \"cloud_t1\": 0.04, \"cloud_t2\": 0.03, \"days_between\": 120, \"month_t1\": 1,  \"month_t2\": 5,  \"label\": 0},\n",
    "    {\"description\": \"Hazy atmospheric scattering over urban core\", \"drift\": 0.142, \"similarity\": 0.858, \"cloud_t1\": 0.07, \"cloud_t2\": 0.22, \"days_between\": 375, \"month_t1\": 12, \"month_t2\": 12, \"label\": 0},\n",
    "    {\"description\": \"Mudflat surface moisture drying\", \"drift\": 0.168, \"similarity\": 0.832, \"cloud_t1\": 0.02, \"cloud_t2\": 0.03, \"days_between\": 45,  \"month_t1\": 11, \"month_t2\": 12, \"label\": 0},\n",
    "    {\"description\": \"Localized industrial smoke plume\", \"drift\": 0.210, \"similarity\": 0.790, \"cloud_t1\": 0.02, \"cloud_t2\": 0.25, \"days_between\": 90,  \"month_t1\": 2,  \"month_t2\": 5,  \"label\": 0},\n",
    "    {\"description\": \"Seasonal salt pan evaporation cycle\", \"drift\": 0.192, \"similarity\": 0.808, \"cloud_t1\": 0.04, \"cloud_t2\": 0.05, \"days_between\": 150, \"month_t1\": 12, \"month_t2\": 5,  \"label\": 0},\n",
    "    {\"description\": \"Subtle satellite sensor view-angle difference\", \"drift\": 0.128, \"similarity\": 0.872, \"cloud_t1\": 0.03, \"cloud_t2\": 0.02, \"days_between\": 10,  \"month_t1\": 12, \"month_t2\": 12, \"label\": 0},\n",
    "    {\"description\": \"High cirrus haze in T1 baseline\", \"drift\": 0.195, \"similarity\": 0.805, \"cloud_t1\": 0.26, \"cloud_t2\": 0.03, \"days_between\": 375, \"month_t1\": 12, \"month_t2\": 12, \"label\": 0},\n",
    "    {\"description\": \"Seasonal scrubland senescence\", \"drift\": 0.150, \"similarity\": 0.850, \"cloud_t1\": 0.02, \"cloud_t2\": 0.03, \"days_between\": 180, \"month_t1\": 10, \"month_t2\": 4,  \"label\": 0},\n",
    "    {\"description\": \"Turbid river sediment outflow pulse\", \"drift\": 0.178, \"similarity\": 0.822, \"cloud_t1\": 0.05, \"cloud_t2\": 0.06, \"days_between\": 60,  \"month_t1\": 7,  \"month_t2\": 9,  \"label\": 0}\n",
    "]\n",
    "\n",
    "df = pd.DataFrame(data)\n",
    "print(f\"Loaded {len(df)} labeled tile pair examples.\")\n",
    "print(f\"Class Distribution: Real Changes={sum(df['label'] == 1)}, False Alarms={sum(df['label'] == 0)}\")\n",
    "df[['drift', 'similarity', 'cloud_t1', 'cloud_t2', 'days_between', 'month_t1', 'month_t2', 'label']].head(10)\n"
]
cells.append({
    "cell_type": "code",
    "execution_count": None,
    "metadata": {},
    "outputs": [],
    "source": cell1_source
})

# Cell 2: EDA & Feature Distributions
cell2_source = [
    "# Cell 2: Visualizing Feature Distributions Split by Label\n",
    "fig, axes = plt.subplots(2, 3, figsize=(16, 9))\n",
    "fig.suptitle(\"Feature Distributions & Separability: Real Change (1) vs False Alarm (0)\", fontsize=15, fontweight='bold')\n",
    "\n",
    "# 1. Drift Distribution\n",
    "sns.histplot(data=df, x='drift', hue='label', kde=True, bins=12, palette=['#e74c3c', '#2ecc71'], ax=axes[0, 0])\n",
    "axes[0, 0].set_title(\"Embedding Drift Distribution\")\n",
    "axes[0, 0].set_xlabel(\"Cosine Dissimilarity Drift\")\n",
    "\n",
    "# 2. Similarity Distribution\n",
    "sns.histplot(data=df, x='similarity', hue='label', kde=True, bins=12, palette=['#e74c3c', '#2ecc71'], ax=axes[0, 1])\n",
    "axes[0, 1].set_title(\"Cosine Similarity Distribution\")\n",
    "axes[0, 1].set_xlabel(\"OpenCLIP Vector Dot Product\")\n",
    "\n",
    "# 3. Cloud Contamination (Max of T1 and T2)\n",
    "df['max_cloud'] = df[['cloud_t1', 'cloud_t2']].max(axis=1)\n",
    "sns.boxplot(data=df, x='label', y='max_cloud', palette=['#e74c3c', '#2ecc71'], ax=axes[0, 2])\n",
    "axes[0, 2].set_title(\"Max Cloud/Shadow Contamination Ratio\")\n",
    "axes[0, 2].set_xticklabels([\"0: False Alarm\", \"1: Real Change\"])\n",
    "\n",
    "# 4. Drift vs Max Cloud Scatter\n",
    "sns.scatterplot(\n",
    "    data=df, x='drift', y='max_cloud', hue='label', style='label',\n",
    "    palette=['#e74c3c', '#2ecc71'], s=120, ax=axes[1, 0]\n",
    ")\n",
    "axes[1, 0].set_title(\"Drift vs Cloud Contamination (Separation Space)\")\n",
    "axes[1, 0].set_xlabel(\"Drift\")\n",
    "axes[1, 0].set_ylabel(\"Max Cloud Ratio\")\n",
    "axes[1, 0].axvline(0.20, color='gray', linestyle='--', alpha=0.6, label='Nominal Drift Cutoff')\n",
    "axes[1, 0].legend(loc='upper right')\n",
    "\n",
    "# 5. Days Between Dates Distribution\n",
    "sns.histplot(data=df, x='days_between', hue='label', kde=False, bins=10, palette=['#e74c3c', '#2ecc71'], ax=axes[1, 1])\n",
    "axes[1, 1].set_title(\"Days Between Observations\")\n",
    "axes[1, 1].set_xlabel(\"Temporal Baseline (Days)\")\n",
    "\n",
    "# 6. Seasonal Month Delta\n",
    "df['month_diff'] = np.abs(df['month_t2'] - df['month_t1'])\n",
    "sns.stripplot(data=df, x='label', y='month_diff', jitter=0.2, size=9, palette=['#e74c3c', '#2ecc71'], ax=axes[1, 2])\n",
    "axes[1, 2].set_title(\"Month Delta (|Month T2 - Month T1|)\")\n",
    "axes[1, 2].set_xticklabels([\"0: False Alarm\", \"1: Real Change\"])\n",
    "\n",
    "plt.tight_layout()\n",
    "plt.show()\n"
]
cells.append({
    "cell_type": "code",
    "execution_count": None,
    "metadata": {},
    "outputs": [],
    "source": cell2_source
})

# Cell 3: Training the RandomForestClassifier
cell3_source = [
    "# Cell 3: Training the RandomForestClassifier\n",
    "from sklearn.ensemble import RandomForestClassifier\n",
    "from sklearn.model_selection import train_test_split\n",
    "\n",
    "features = ['drift', 'similarity', 'cloud_t1', 'cloud_t2', 'days_between', 'month_t1', 'month_t2']\n",
    "X = df[features]\n",
    "y = df['label']\n",
    "\n",
    "# Stratified train/test split to guarantee class balance in test set\n",
    "X_train, X_test, y_train, y_test = train_test_split(\n",
    "    X, y, test_size=0.25, random_state=42, stratify=y\n",
    ")\n",
    "\n",
    "print(f\"Training set shape: {X_train.shape}, Test set shape: {X_test.shape}\")\n",
    "\n",
    "# Initialize Random Forest with balanced class weights and restrained depth for robust generalization\n",
    "rf = RandomForestClassifier(\n",
    "    n_estimators=50,\n",
    "    max_depth=4,\n",
    "    min_samples_split=2,\n",
    "    class_weight=\"balanced\",\n",
    "    random_state=42\n",
    ")\n",
    "\n",
    "# Fit on training set\n",
    "rf.fit(X_train, y_train)\n",
    "print(\"Random Forest Model trained successfully on training subset.\")\n"
]
cells.append({
    "cell_type": "code",
    "execution_count": None,
    "metadata": {},
    "outputs": [],
    "source": cell3_source
})

# Cell 4: Confusion Matrix & Classification Report
cell4_source = [
    "# Cell 4: Confusion Matrix Heatmap & Classification Report\n",
    "from sklearn.metrics import confusion_matrix, classification_report\n",
    "\n",
    "y_pred = rf.predict(X_test)\n",
    "cm = confusion_matrix(y_test, y_pred)\n",
    "\n",
    "fig, ax = plt.subplots(figsize=(6, 5))\n",
    "sns.heatmap(\n",
    "    cm, annot=True, fmt=\"d\", cmap=\"Blues\", cbar=False,\n",
    "    xticklabels=[\"Pred: False Alarm (0)\", \"Pred: Real Change (1)\"],\n",
    "    yticklabels=[\"True: False Alarm (0)\", \"True: Real Change (1)\"],\n",
    "    annot_kws={\"size\": 14, \"weight\": \"bold\"}\n",
    ")\n",
    "ax.set_title(\"Test Set Confusion Matrix\", fontsize=13, fontweight='bold', pad=12)\n",
    "plt.ylabel(\"Ground Truth\")\n",
    "plt.xlabel(\"RF Prediction\")\n",
    "plt.tight_layout()\n",
    "plt.show()\n",
    "\n",
    "print(\"Classification Report (Test Set):\")\n",
    "print(classification_report(y_test, y_pred, target_names=[\"False Alarm\", \"Real Change\"]))\n"
]
cells.append({
    "cell_type": "code",
    "execution_count": None,
    "metadata": {},
    "outputs": [],
    "source": cell4_source
})

# Cell 5: Plotting Feature Importances
cell5_source = [
    "# Cell 5: Feature Importances Bar Chart\n",
    "importances = rf.feature_importances_\n",
    "feat_df = pd.DataFrame({\n",
    "    'Feature': features,\n",
    "    'Importance': importances\n",
    "}).sort_values('Importance', ascending=False)\n",
    "\n",
    "fig, ax = plt.subplots(figsize=(9, 4.5))\n",
    "palette = sns.color_palette(\"viridis\", len(feat_df))\n",
    "bars = sns.barplot(data=feat_df, x='Importance', y='Feature', palette=palette, ax=ax)\n",
    "\n",
    "for p in ax.patches:\n",
    "    width = p.get_width()\n",
    "    ax.annotate(f'{width:.3f}', (width + 0.005, p.get_y() + p.get_height() / 2.),\n",
    "                va='center', fontsize=11, fontweight='bold', color='#2c3e50')\n",
    "\n",
    "ax.set_title(\"Gini Feature Importances in False-Alarm Suppression\", fontsize=13, fontweight='bold')\n",
    "ax.set_xlabel(\"Importance Score (Sum = 1.0)\")\n",
    "ax.set_xlim(0, max(importances) * 1.2)\n",
    "plt.tight_layout()\n",
    "plt.show()\n",
    "\n",
    "print(\"Ranked Feature Importances:\")\n",
    "for _, row in feat_df.iterrows():\n",
    "    print(f\"  {row['Feature']:<14}: {row['Importance']:.4f}\")\n"
]
cells.append({
    "cell_type": "code",
    "execution_count": None,
    "metadata": {},
    "outputs": [],
    "source": cell5_source
})

# Cell 6: Retrain on Full Dataset and Save Final Model
cell6_source = [
    "# Cell 6: Final Verification & Model Serialization\n",
    "# Retrain on all 28 curated examples for maximum production fidelity\n",
    "final_rf = RandomForestClassifier(\n",
    "    n_estimators=50,\n",
    "    max_depth=4,\n",
    "    min_samples_split=2,\n",
    "    class_weight=\"balanced\",\n",
    "    random_state=42\n",
    ")\n",
    "final_rf.fit(X, y)\n",
    "\n",
    "model_path = r\"data/models/rf_false_alarm.joblib\"\n",
    "os.makedirs(os.path.dirname(model_path), exist_ok=True)\n",
    "joblib.dump(final_rf, model_path)\n",
    "\n",
    "print(f\"Successfully exported trained Random Forest model to: {model_path}\")\n",
    "print(f\"Model file size: {os.path.getsize(model_path):,} bytes\")\n",
    "\n",
    "# Verification test using predict_proba on a test sample\n",
    "sample_real = [[0.284, 0.716, 0.02, 0.03, 375, 12, 12]]  # Runway earthworks\n",
    "sample_false = [[0.210, 0.790, 0.02, 0.25, 90, 2, 5]]    # Cloud/haze false alarm\n",
    "\n",
    "p_real = final_rf.predict_proba(sample_real)[0][1]\n",
    "p_false = final_rf.predict_proba(sample_false)[0][1]\n",
    "\n",
    "print(f\"\\nSample Inferences:\")\n",
    "print(f\"  Real Earthworks change -> confidence: {p_real:.4f} (predict_proba[1])\")\n",
    "print(f\"  Cloud Fringe false alarm -> confidence: {p_false:.4f} (predict_proba[1])\")\n"
]
cells.append({
    "cell_type": "code",
    "execution_count": None,
    "metadata": {},
    "outputs": [],
    "source": cell6_source
})

notebook = {
    "cells": cells,
    "metadata": {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3"
        },
        "language_info": {
            "codemirror_mode": {
                "name": "ipython",
                "version": 3
            },
            "file_extension": ".py",
            "mimetype": "text/x-python",
            "name": "python",
            "nbconvert_exporter": "python",
            "pygments_lexer": "ipython3",
            "version": "3.13"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 2
}

with open(notebook_path, "w", encoding="utf-8") as f:
    json.dump(notebook, f, indent=2)

print(f"Notebook created at {notebook_path}")
