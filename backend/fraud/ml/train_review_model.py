import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# 1. load dataset
df = pd.read_csv("fraud/datasets/fake reviews dataset.csv")

# 2. choose features
X = df["text_"]
y = df["label"]

# 3. split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42
)

# 4. model pipeline
model = Pipeline([
    ("tfidf", TfidfVectorizer()),
    ("clf", LogisticRegression(max_iter=1000))
])

# 5. train model
model.fit(X_train, y_train)

# 6. save model
joblib.dump(model, "fraud/models_ai/fake_review_model.pkl")

print("✅ Model trained successfully!")