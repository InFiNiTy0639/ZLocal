# 🚚 Hyperlocal Delivery ETA Optimizer Using Weather & Traffic

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](#-license)

A machine learning-powered platform to **accurately predict delivery times** in hyperlocal logistics by fusing **Google Maps**, **live weather**, and **historical trip data**.

> 📍 Built for logistics, Q-commerce, and smart urban mobility solutions.

---

## ✨ Features

- 🔮 **ETA Prediction** using XGBoost (or LSTM)
- 🛰️ **Real-time inputs** from Google Maps & OpenWeather API
- 🛣️ Incorporates traffic level, distance, temperature, and rainfall
- 🧠 Option to train your own model with past trip data
- 🌐 **FastAPI backend** for prediction API
- 💻 **Next.js frontend** to collect trip data and display ETA
- 🚀 Fully ready for local and cloud deployment

---

## 🧰 Tech Stack

| Layer       | Technology                     |
|------------|----------------------------------|
| Frontend    | [Next.js](https://nextjs.org/) (TypeScript, Tailwind CSS) |
| Backend     | [FastAPI](https://fastapi.tiangolo.com/) + Uvicorn         |
| ML Model    | XGBoost / LSTM (customizable)   |
| Data        | Google Maps API, OpenWeatherMap API, Custom Trip Logs |
| Dev Tools   | Python 3.10+, Jupyter, Pandas, Scikit-learn, Joblib |

---

## 🛠️ Getting Started

### ✅ Prerequisites
- Python 3.10+ (Download: [python.org](https://python.org))
- Node.js 18+ (for frontend)

---

### 📦 Backend Setup

```bash
# Clone repo
# Create virtual env in backend
cd backend
python -m venv venv (git bash)
source venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt

#Create Model
cd backend
python src/train_model.py

# Run the Backend
cd backend
uvicorn src.main:app --reload

