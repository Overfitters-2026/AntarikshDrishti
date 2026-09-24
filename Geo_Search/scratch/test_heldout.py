import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import pandas as pd
import joblib
from train_rf_classifier import build_dataset
from sklearn.model_selection import train_test_split

df = build_dataset()
features = ['drift', 'similarity', 'cloud_t1', 'cloud_t2', 'days_between', 'month_t1', 'month_t2']
X = df[features]
y = df['label']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
model = joblib.load('data/models/rf_false_alarm.joblib')

test_df = df.loc[X_test.index].copy()
probas = model.predict_proba(test_df[features])
test_df['P_FalseAlarm'] = probas[:, 0]
test_df['P_RealChange_Confidence'] = probas[:, 1]

print("======================================================================================================")
print(f"{'True Class':<18} | {'Description':<42} | {'Drift':<6} | {'Confidence (P_Real)':<20}")
print("======================================================================================================")
for _, r in test_df.iterrows():
    lbl_str = "1: Real Change" if r['label'] == 1 else "0: False Alarm"
    print(f"{lbl_str:<18} | {r['description']:<42} | {r['drift']:<6.3f} | {r['P_RealChange_Confidence']:<20.4f}")
print("======================================================================================================")
