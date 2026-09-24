import joblib
import pandas as pd
import numpy as np

model = joblib.load("data/models/rf_false_alarm.joblib")
features = ["drift", "similarity", "cloud_t1", "cloud_t2", "days_between", "month_t1", "month_t2"]

test_cases = [
    {
        "class_label": "1: Real Change",
        "description": "Navi Mumbai airport runway earthworks",
        "drift": 0.284,
        "similarity": 0.716,
        "cloud_t1": 0.02,
        "cloud_t2": 0.03,
        "days_between": 375,
        "month_t1": 12,
        "month_t2": 12,
    },
    {
        "class_label": "1: Real Change",
        "description": "Terminal foundation concrete laying",
        "drift": 0.312,
        "similarity": 0.688,
        "cloud_t1": 0.04,
        "cloud_t2": 0.05,
        "days_between": 375,
        "month_t1": 12,
        "month_t2": 12,
    },
    {
        "class_label": "0: False Alarm",
        "description": "Coastal water sun glint / wave reflection",
        "drift": 0.175,
        "similarity": 0.825,
        "cloud_t1": 0.02,
        "cloud_t2": 0.03,
        "days_between": 15,
        "month_t1": 12,
        "month_t2": 12,
    },
    {
        "class_label": "0: False Alarm",
        "description": "Seasonal grass greening post-monsoon",
        "drift": 0.185,
        "similarity": 0.815,
        "cloud_t1": 0.05,
        "cloud_t2": 0.04,
        "days_between": 180,
        "month_t1": 4,
        "month_t2": 10,
    },
]

df = pd.DataFrame(test_cases)
X = df[features]
probas = model.predict_proba(X)

print("------------------------------------------------------------------------------------------------------")
print(f"{'Category':<16} | {'Description':<40} | {'Drift':<6} | {'P(False Alarm)':<14} | {'P(Real Change)':<14}")
print("------------------------------------------------------------------------------------------------------")
for i, tc in enumerate(test_cases):
    p_false = probas[i][0]
    p_real = probas[i][1]
    print(f"{tc['class_label']:<16} | {tc['description']:<40} | {tc['drift']:<6.3f} | {p_false:<14.4f} | {p_real:<14.4f}")
print("------------------------------------------------------------------------------------------------------")

# Calculate gap
real_avg = (probas[0][1] + probas[1][1]) / 2.0
false_avg = (probas[2][1] + probas[3][1]) / 2.0
print(f"Average Real Change Confidence: {real_avg:.4f}")
print(f"Average False Alarm Confidence: {false_avg:.4f}")
print(f"Separation Gap: {real_avg - false_avg:.4f}")
