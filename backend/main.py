from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import uvicorn

app = FastAPI(title="Real-time Steam AI Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khởi tạo mô hình AI NLP chuyên nghiệp
analyzer = SentimentIntensityAnalyzer()

class ReviewInput(BaseModel):
    text: str

# API 1: Test 1 câu văn bất kỳ (để thấy AI đã thông minh lên)
@app.post("/api/predict")
async def analyze_single_review(review: ReviewInput):
    # VADER sẽ chấm điểm câu văn (bao gồm cả việc hiểu "not good" là tiêu cực)
    scores = analyzer.polarity_scores(review.text)
    
    # Điểm compound chạy từ -1 (Cực tệ) đến +1 (Cực tốt)
    if scores['compound'] >= 0.05:
        sentiment = "Tích cực (Positive) 😍"
    elif scores['compound'] <= -0.05:
        sentiment = "Tiêu cực (Negative) 😡"
    else:
        sentiment = "Trung lập (Neutral) 😐"
        
    return {
        "prediction": sentiment,
        "confidence": round(abs(scores['compound']) * 100, 2),
        "scores": scores,
        "message": "Phân tích bằng mô hình VADER NLP!"
    }

@app.get("/api/steam-live/{app_id}")
async def get_steam_live(app_id: str):
    try:
        # 1. Fetch Game Details (l=english)
        details_url = f"https://store.steampowered.com/api/appdetails?appids={app_id}&l=english"
        details_res = requests.get(details_url).json()
        game_data = details_res.get(str(app_id), {}).get("data", {})
        
        game_name = game_data.get("name", "Game not found")
        description = game_data.get("short_description", "No description available.")
        header_image = game_data.get("header_image", "")

        # 2. Fetch Live Players
        players_url = f"https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid={app_id}"
        players_res = requests.get(players_url).json()
        current_players = players_res.get("response", {}).get("player_count", 0)

        # 3. Fetch Recent Reviews (language=english)
        reviews_url = f"https://store.steampowered.com/appreviews/{app_id}?json=1&language=english&num_per_page=50"
        reviews_res = requests.get(reviews_url).json()
        reviews = reviews_res.get("reviews", [])

        # 4. Sentiment Analysis Loop
        pos = 0; neg = 0; neu = 0
        analyzed_reviews = []

        for r in reviews:
            text = r.get("review", "")
            author_id = r.get("author", {}).get("steamid", "Anonymous")
            
            # --- GỌI HÀM VADER CỦA BẠN TẠI ĐÂY ---
            # Ví dụ: scores = analyzer.polarity_scores(text)
            # Dưới đây là logic giả định để phân loại tiếng Anh:
            ai_label = "Positive" # Thay bằng kết quả thật từ VADER
            
            if "positive" in ai_label.lower(): pos += 1
            elif "negative" in ai_label.lower(): neg += 1
            else: neu += 1
            
            analyzed_reviews.append({
                "author": author_id,
                "text": text,
                "label": ai_label
            })

        return {
            "game_info": {
                "name": game_name,
                "description": description,
                "header_image": header_image,
                "current_players": current_players
            },
            "sentiment_distribution": [
                {"name": "Positive", "value": pos},
                {"name": "Negative", "value": neg},
                {"name": "Neutral", "value": neu}
            ],
            "reviews": analyzed_reviews
        }
    except Exception as e:
        return {"error": str(e)}