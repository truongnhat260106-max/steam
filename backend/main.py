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

import urllib.parse
# Các thư viện khác giữ nguyên...

# --- THÊM PHẦN TÌM KIẾM TÊN GAME ---
# Biến toàn cục lưu danh sách game vào RAM để server không phải tải lại nhiều lần
steam_app_cache = {}

def get_app_id_from_name(game_name: str):
    global steam_app_cache
    # Nếu RAM chưa có dữ liệu, tải danh sách 100,000+ game từ Steam (Chỉ tốn 1-2s cho lần tra cứu ĐẦU TIÊN)
    if not steam_app_cache:
        try:
            res = requests.get("https://api.steampowered.com/ISteamApps/GetAppList/v2/", timeout=10)
            apps = res.json().get("applist", {}).get("apps", [])
            for app in apps:
                # Lưu tên dạng chữ thường để dễ tìm
                steam_app_cache[app["name"].lower()] = str(app["appid"])
        except Exception as e:
            print("Lỗi tải danh sách game:", e)
            return None

    search_term = game_name.lower().strip()
    
    # Ưu tiên 1: Khớp chính xác 100% (VD: gõ "dota 2" ra đúng ID của dota 2)
    if search_term in steam_app_cache:
        return steam_app_cache[search_term]
        
    # Ưu tiên 2: Khớp một phần (VD: gõ "cyberpunk" sẽ ra "cyberpunk 2077")
    for name, app_id in steam_app_cache.items():
        if search_term in name:
            return app_id
            
    return None

# Đổi {app_id} thành {query} để nhận cả chữ lẫn số
@app.get("/api/steam-live/{query}")
async def get_steam_live(query: str):
    try:
        # BỘ LỌC THÔNG MINH: Kiểm tra người dùng nhập Số (ID) hay Chữ (Tên Game)
        if query.isdigit():
            app_id = query
        else:
            app_id = get_app_id_from_name(query)
            if not app_id:
                return {"error": f"Game not found with name: '{query}'. Please try the exact name."}

        # --- TỪ ĐÂY TRỞ XUỐNG LÀ LUỒNG CÀO DỮ LIỆU NHƯ CŨ (Dùng app_id đã tìm được) ---
        # 1. Lấy thông tin cơ bản
        details_url = f"https://store.steampowered.com/api/appdetails?appids={app_id}&l=english"
        details_res = requests.get(details_url).json()
        game_data = details_res.get(str(app_id), {}).get("data", {})
        
        game_name = game_data.get("name", "Game not found")
        description = game_data.get("short_description", "No description available.")
        header_image = game_data.get("header_image", "")

        # 2. Lấy lượng người chơi online
        players_url = f"https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid={app_id}"
        players_res = requests.get(players_url).json()
        current_players = players_res.get("response", {}).get("player_count", 0)

        # 3. Lấy 200 bình luận mới nhất
        reviews = []
        cursor = "*" 
        
        for _ in range(2): 
            encoded_cursor = urllib.parse.quote(cursor)
            reviews_url = f"https://store.steampowered.com/appreviews/{app_id}?json=1&language=english&filter=recent&num_per_page=100&cursor={encoded_cursor}"
            reviews_res = requests.get(reviews_url).json()
            
            if "reviews" in reviews_res:
                reviews.extend(reviews_res["reviews"])
            
            cursor = reviews_res.get("cursor")
            if not cursor:
                break 

        # 4. Phân tích bằng VADER
        pos = 0; neg = 0; neu = 0
        analyzed_reviews = []

        for r in reviews:
            text = r.get("review", "")
            author_id = r.get("author", {}).get("steamid", "Anonymous")
            
            scores = analyzer.polarity_scores(text)
            compound = scores['compound']
            
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