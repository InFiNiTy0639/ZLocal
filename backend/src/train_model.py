import pickle
import logging
import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.metrics import r2_score
from sklearn.compose import ColumnTransformer
from math import radians, sin, cos, sqrt, atan2
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder, StandardScaler

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load data
try:
    df = pd.read_csv('data/corrected_modified_train.csv')
    logger.info("Dataset loaded successfully")
except FileNotFoundError:
    logger.error("Dataset file not found")
    raise

# Data cleaning
df = df.rename(columns={
    "City": "City_area",
    "Weatherconditions": "Weather_conditions",
    "Time_taken(min)": "Time_taken"
})

# Extract temporal features
df['Order_Date'] = pd.to_datetime(df['Order_Date'], format='%d-%m-%Y', errors='coerce')
df['day_of_week'] = df['Order_Date'].dt.dayofweek.fillna(2)
df['Time_Orderd'] = pd.to_datetime(df['Time_Orderd'], format='%H:%M', errors='coerce')

# Log invalid Time_Orderd entries
invalid_times = df['Time_Orderd'].isna().sum()
# logger.info(f"Number of invalid or missing Time_Orderd entries: {invalid_times}")

# Handle hour_of_day
if df['Time_Orderd'].notna().any():
    mode_hour = df['Time_Orderd'].dropna().mode()
    default_hour = mode_hour.dt.hour[0] if not mode_hour.empty else 12
else:
    default_hour = 12  # Default to noon if all Time_Orderd are NaT
    # logger.warning("All Time_Orderd values are invalid; using default hour: 12")

df['hour_of_day'] = df['Time_Orderd'].dt.hour.fillna(default_hour)

df = df.drop(columns=["ID", "Delivery_person_ID", "Order_Date", "Time_Orderd", 
                      "Time_Order_picked", "Type_of_order"], axis=1)

df['Weather_conditions'] = df['Weather_conditions'].str.split(" ").str[-1]
df['Time_taken'] = df['Time_taken'].str.split(" ").str[-1].astype("int")


# Handle missing values and clean strings
for col in df.select_dtypes(include="object"):
    df[col] = df[col].apply(lambda x: x.strip().lower() if isinstance(x, str) else x)
    df[col] = df[col].replace("nan", np.nan, regex=True)

df['City_area'] = df['City_area'].replace('metropolitian', 'metropolitan')

cols = ["City_area", "Weather_conditions", "Road_traffic_density", "Festival", "Type_of_vehicle"]
for col in cols:
    df[col] = df[col].fillna(df[col].mode()[0])

df['multiple_deliveries'] = df['multiple_deliveries'].fillna(df['multiple_deliveries'].mode()[0])

df['Delivery_person_Age'] = df['Delivery_person_Age'].astype("float")
df['Delivery_person_Ratings'] = df['Delivery_person_Ratings'].astype("float")

null_count = df['Delivery_person_Age'].isnull().sum()
min_value = df['Delivery_person_Age'].min()
max_value = df['Delivery_person_Age'].max()
uniform_age_ary = np.random.randint(min_value, max_value, null_count)
null_indices = df[df['Delivery_person_Age'].isnull()].index
df.loc[null_indices, 'Delivery_person_Age'] = uniform_age_ary

df['Delivery_person_Ratings'] = df['Delivery_person_Ratings'].fillna(df['Delivery_person_Ratings'].median())
df = df[df['Delivery_person_Ratings'] <= 5]

# Remove invalid coordinates
df = df[~((df['Restaurant_latitude'] == 0.0) | (df['Restaurant_longitude'] == 0.0) | 
          (df['Delivery_location_latitude'] == 0.0) | (df['Delivery_location_longitude'] == 0.0) |
          (df['Restaurant_latitude'] < 0) | (df['Restaurant_longitude'] < 0) |
          (df['Delivery_location_latitude'] < 0) | (df['Delivery_location_longitude'] < 0))]

# Feature engineering: Haversine distance
def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

df['distance_km'] = df.apply(lambda row: haversine_distance(
    row['Restaurant_latitude'], row['Restaurant_longitude'],
    row['Delivery_location_latitude'], row['Delivery_location_longitude']), axis=1)

# Filter hyperlocal distances (<20 km)
df = df[df['distance_km'] <= 20]

df = df.drop(['Restaurant_latitude', 'Restaurant_longitude', 
              'Delivery_location_latitude', 'Delivery_location_longitude'], axis=1)

# Preprocessing
preprocessor = ColumnTransformer(
    transformers=[
        ('ohe', OneHotEncoder(drop='first'), ['Type_of_vehicle', 'Festival', 'Vehicle_condition']),
        ('oe1', OrdinalEncoder(categories=[['low', 'medium', 'high', 'jam']]), ['Road_traffic_density']),
        ('oe2', OrdinalEncoder(categories=[['sunny', 'cloudy', 'windy', 'fog', 'sandstorms', 'stormy']]), ['Weather_conditions']),
        ('oe3', OrdinalEncoder(categories=[['semi-urban', 'urban', 'metropolitan']]), ['City_area']),
        ('scaler', StandardScaler(), ['Delivery_person_Age', 'Delivery_person_Ratings', 'multiple_deliveries', 
                                      'distance_km', 'hour_of_day', 'day_of_week'])
    ],
    remainder='passthrough'
)

X = df.drop('Time_taken', axis=1)
Y = df['Time_taken']
X_train, X_test, Y_train, Y_test = train_test_split(X, Y, test_size=0.25, random_state=7)

# Compute sample weights for hyperlocal focus
sample_weights = np.where(X_train['distance_km'] <= 2, 2.0, 1.0)

X_train_prepared = preprocessor.fit_transform(X_train)
X_test_prepared = preprocessor.transform(X_test)

# Train XGBoost model with tuned hyperparameters
xgb_model = XGBRegressor(
    objective='reg:squarederror',
    random_state=42,
    learning_rate=0.05,
    n_estimators=300,
    max_depth=5,
    subsample=0.8,
    colsample_bytree=0.8
)
xgb_model.fit(X_train_prepared, Y_train, sample_weight=sample_weights)
y_pred_xgb = xgb_model.predict(X_test_prepared)
r2 = r2_score(Y_test, y_pred_xgb)
print(f"XGBoost R² Score: {r2}")

# Save model and preprocessor
with open("models/xgb_model.pkl", "wb") as f:
    pickle.dump(xgb_model, f)
with open("models/preprocessor.pkl", "wb") as f:
    pickle.dump(preprocessor, f)

logger.info(f"Model trained and saved with R² Score: {r2}")