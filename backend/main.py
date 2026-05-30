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

# API 2: CÀO DỮ LIỆU THỰC TẾ TỪ STEAM & PHÂN TÍCH HÀNG LOẠT
@app.get("/api/steam-live/{app_id}")
async def get_live_steam_reviews(app_id: int):
    # 1. Gọi API phụ để lấy Tên Game thật
    game_name = f"Game ID {app_id}" # Tên mặc định nếu lỗi
    try:
        details_url = f"https://store.steampowered.com/api/appdetails?appids={app_id}"
        details_response = requests.get(details_url, timeout=5)
        details_data = details_response.json()
        
        # Nếu Steam trả về success = true, trích xuất tên game
        if str(app_id) in details_data and details_data[str(app_id)].get('success'):
            game_name = details_data[str(app_id)]['data']['name']
    except Exception as e:
        print("Không lấy được tên game:", e)

    # 2. Gọi API chính để lấy Bình luận
    url = f"https://store.steampowered.com/appreviews/{app_id}?json=1&language=english&num_per_page=100"
    
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        
        if data.get('success') != 1 or not data.get('reviews'):
            raise HTTPException(status_code=404, detail="Không tìm thấy Game hoặc chưa có bình luận!")

        reviews = data['reviews']
        positive_count = 0
        negative_count = 0
        neutral_count = 0
        
        for rev in reviews:
            text = rev['review']
            scores = analyzer.polarity_scores(text)
            
            if scores['compound'] >= 0.05:
                positive_count += 1
            elif scores['compound'] <= -0.05:
                negative_count += 1
            else:
                neutral_count += 1

        return {
            "game_name": game_name,  # Trả về tên thật của Game ở đây!
            "total_analyzed": len(reviews),
            "positive": positive_count,
            "negative": negative_count,
            "neutral": neutral_count,
            "sentiment_distribution": [
                {"name": "Tích cực", "value": positive_count},
                {"name": "Tiêu cực", "value": negative_count},
                {"name": "Trung lập", "value": neutral_count}
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
