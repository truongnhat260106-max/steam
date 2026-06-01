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

import urllib.parse # Thêm thư viện này ở đầu file để xử lý lỗi link lật trang

@app.get("/api/steam-live/{app_id}")
async def get_steam_live(app_id: str):
    try:
        # 1. Lấy thông tin cơ bản của Game
        details_url = f"https://store.steampowered.com/api/appdetails?appids={app_id}&l=english"
        details_res = requests.get(details_url).json()
        game_data = details_res.get(str(app_id), {}).get("data", {})
        
        game_name = game_data.get("name", "Game not found")
        description = game_data.get("short_description", "No description available.")
        header_image = game_data.get("header_image", "")

        # 2. Lấy lượng người chơi Real-time
        players_url = f"https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid={app_id}"
        players_res = requests.get(players_url).json()
        current_players = players_res.get("response", {}).get("player_count", 0)

        # 3. Lấy 200 bình luận MỚI NHẤT (Dùng vòng lặp lật 2 trang, mỗi trang 100)
        reviews = []
        cursor = "*" # Dấu * báo cho Steam biết đây là trang đầu tiên
        
        for _ in range(2): 
            encoded_cursor = urllib.parse.quote(cursor) # Mã hóa cursor để không bị lỗi link
            # filter=recent giúp lấy bình luận mới nhất thay vì bình luận hữu ích nhất
            reviews_url = f"https://store.steampowered.com/appreviews/{app_id}?json=1&language=english&filter=recent&num_per_page=100&cursor={encoded_cursor}"
            reviews_res = requests.get(reviews_url).json()
            
            if "reviews" in reviews_res:
                reviews.extend(reviews_res["reviews"])
            
            # Lấy chìa khóa (cursor) để mở trang tiếp theo
            cursor = reviews_res.get("cursor")
            if not cursor:
                break # Nếu game ít review, hết rồi thì dừng lặp

        # 4. Cho AI VADER thật sự đọc và chấm điểm
        pos = 0; neg = 0; neu = 0
        analyzed_reviews = []

        for r in reviews:
            text = r.get("review", "")
            author_id = r.get("author", {}).get("steamid", "Anonymous")
            
            # ĐÃ BỎ CODE GIẢ ĐỊNH. GỌI VADER NLP THẬT TẠI ĐÂY:
            scores = analyzer.polarity_scores(text)
            compound = scores['compound']
            
            # Phân loại dựa trên điểm số compound của VADER
            if compound >= 0.05:
                ai_label = "Positive"
                pos += 1
            elif compound <= -0.05:
                ai_label = "Negative"
                neg += 1
            else:
                ai_label = "Neutral"
                neu += 1
            
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