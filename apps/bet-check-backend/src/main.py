"""
Sports Prediction Tool - FastAPI Backend
This service handles game predictions using weighted factors and adaptive learning.

Copyright (c) 2025 Jmenichole
Licensed under MIT License
https://jmenichole.github.io/Portfolio/
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import numpy as np
from datetime import datetime
try:
    from supabase import create_client, Client
except ImportError:
    Client = None
    create_client = None

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Initialize FastAPI app
app = FastAPI(
    title="Sports Prediction API",
    description="AI-powered sports prediction engine with adaptive learning",
    version="1.0.0"
)

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client (with fallback for demo mode)
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY and "your-project-id" not in SUPABASE_URL and create_client:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Warning: Could not connect to Supabase: {e}")
        print("Running in demo mode without database")
else:
    print("⚠️  Supabase credentials not configured in .env or library missing")
    print("Running in demo mode - database features disabled")

# ==================== Pydantic Models ====================

class Game(BaseModel):
    game_id: str
    sport: str
    team_a: str
    team_b: str
    scheduled_date: str
    result: Optional[str] = None

class Factor(BaseModel):
    factor_id: int
    name: str
    base_weight: float
    current_weight: float
    min_weight: float
    max_weight: float

class Prediction(BaseModel):
    game_id: str
    predicted_outcome: str
    confidence: float
    reasons: List[str]
    factor_contributions: dict

class ResultLog(BaseModel):
    game_id: str
    actual_outcome: str

# ==================== Demo Data ====================

DEMO_FACTORS = [
    {"factor_id": 1, "name": "Recent Form", "base_weight": 0.20, "current_weight": 0.20, "min_weight": 0.05, "max_weight": 0.40},
    {"factor_id": 2, "name": "Injury Status", "base_weight": 0.18, "current_weight": 0.18, "min_weight": 0.05, "max_weight": 0.35},
    {"factor_id": 3, "name": "Offensive Efficiency", "base_weight": 0.22, "current_weight": 0.22, "min_weight": 0.10, "max_weight": 0.40},
    {"factor_id": 4, "name": "Defensive Efficiency", "base_weight": 0.20, "current_weight": 0.20, "min_weight": 0.10, "max_weight": 0.35},
    {"factor_id": 5, "name": "Home Court Advantage", "base_weight": 0.20, "current_weight": 0.20, "min_weight": 0.05, "max_weight": 0.35},
]

# Fetch live games from ESPN
def fetch_live_games():
    try:
        import requests
        from datetime import timedelta
        
        sport_path = "basketball/nba"
        all_games = []
        
        for days_ahead in range(5):
            try:
                target_date = datetime.now() + timedelta(days=days_ahead)
                date_str = target_date.strftime("%Y%m%d")
                url = f"http://site.api.espn.com/apis/site/v2/sports/{sport_path}/scoreboard?dates={date_str}"
                
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    events = data.get("events", [])
                    
                    for event in events:
                        comps = event.get("competitions", [{}])[0]
                        competitors = comps.get("competitors", [])
                        if len(competitors) >= 2:
                            all_games.append({
                                "game_id": f"nba_{event.get('id')}",
                                "sport": "nba",
                                "team_a": competitors[0].get("team", {}).get("displayName", "Unknown"),
                                "team_b": competitors[1].get("team", {}).get("displayName", "Unknown"),
                                "scheduled_date": event.get("date", "")[:10],
                                "result": None
                            })
            except:
                continue
        return all_games if all_games else None
    except:
        return None

DEMO_GAMES = fetch_live_games() or [
    {"game_id": "nba_demo_1", "sport": "nba", "team_a": "Los Angeles Lakers", "team_b": "Boston Celtics", "scheduled_date": datetime.now().strftime("%Y-%m-%d"), "result": None},
    {"game_id": "nba_demo_2", "sport": "nba", "team_a": "Golden State Warriors", "team_b": "Denver Nuggets", "scheduled_date": datetime.now().strftime("%Y-%m-%d"), "result": None},
]

# ==================== Core Prediction Logic ====================

class PredictionEngine:
    LEARNING_RATE = 0.05
    
    @staticmethod
    def calculate_prediction(game_id: str, team_a: str, team_b: str) -> Prediction:
        if supabase:
            factors_response = supabase.table("factors").select("*").execute()
            factors = {f["factor_id"]: f for f in factors_response.data}
        else:
            factors = {f["factor_id"]: f for f in DEMO_FACTORS}
        
        factor_scores = {
            1: {"team_a": 0.75, "team_b": 0.65, "name": "Recent Form"},
            2: {"team_a": 0.70, "team_b": 0.80, "name": "Injury Status"},
            3: {"team_a": 0.82, "team_b": 0.68, "name": "Offensive Efficiency"},
            4: {"team_a": 0.72, "team_b": 0.75, "name": "Defensive Efficiency"},
            5: {"team_a": 0.80, "team_b": 0.60, "name": "Home Court Advantage"},
        }
        
        team_a_score = 0.0
        team_b_score = 0.0
        factor_contributions = {}
        
        for factor_id, scores in factor_scores.items():
            if factor_id in factors:
                weight = factors[factor_id]["current_weight"]
                team_a_contribution = scores["team_a"] * weight
                team_b_contribution = scores["team_b"] * weight
                
                team_a_score += team_a_contribution
                team_b_score += team_b_contribution
                
                factor_contributions[scores["name"]] = {
                    "team_a": round(team_a_contribution, 3),
                    "team_b": round(team_b_contribution, 3)
                }
        
        if team_a_score > team_b_score:
            predicted_outcome = team_a
            confidence = min(100, (team_a_score / (team_a_score + team_b_score)) * 100)
        else:
            predicted_outcome = team_b
            confidence = min(100, (team_b_score / (team_a_score + team_b_score)) * 100)
        
        sorted_contributions = sorted(
            factor_contributions.items(),
            key=lambda x: abs(x[1]["team_a"] - x[1]["team_b"]),
            reverse=True
        )[:3]
        
        reasons = [
            f"{name}: {predicted_outcome} has stronger {name.lower()} ({scores[('team_a' if predicted_outcome == team_a else 'team_b')]:.2f})"
            for name, scores in sorted_contributions
        ]
        
        return Prediction(
            game_id=game_id,
            predicted_outcome=predicted_outcome,
            confidence=round(confidence, 2),
            reasons=reasons,
            factor_contributions=factor_contributions
        )
    
    @staticmethod
    def update_weights(game_id: str, actual_outcome: str) -> None:
        if not supabase: return
        try:
            pred_response = supabase.table("predictions").select("*").eq("game_id", game_id).execute()
            if not pred_response.data: return
            
            prediction = pred_response.data[0]
            was_correct = (prediction["predicted_outcome"] == actual_outcome)
            
            # This is a simplified version for the migration
            factors_response = supabase.table("factors").select("*").execute()
            for factor in factors_response.data:
                current_weight = factor["current_weight"]
                if was_correct:
                    new_weight = min(factor["max_weight"], current_weight + (PredictionEngine.LEARNING_RATE * 0.1))
                else:
                    new_weight = max(factor["min_weight"], current_weight - (PredictionEngine.LEARNING_RATE * 0.1))
                
                supabase.table("factors").update({"current_weight": new_weight}).eq("factor_id", factor["factor_id"]).execute()
        except Exception as e:
            print(f"Error updating weights: {e}")

# ==================== API Endpoints ====================

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "bet-check-api"}

@app.get("/games", response_model=List[Game])
async def list_games(sport: Optional[str] = None):
    try:
        if supabase:
            query = supabase.table("games").select("*").is_("result", "null")
            if sport: query = query.eq("sport", sport.lower())
            response = query.execute()
            return response.data
        else:
            games = DEMO_GAMES
            if sport: games = [g for g in games if g["sport"].lower() == sport.lower()]
            return games
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/predict/{game_id}", response_model=Prediction)
async def get_prediction(game_id: str):
    try:
        if supabase:
            game_response = supabase.table("games").select("*").eq("game_id", game_id).execute()
            if not game_response.data: raise HTTPException(status_code=404, detail="Game not found")
            game = game_response.data[0]
        else:
            game = next((g for g in DEMO_GAMES if g["game_id"] == game_id), None)
            if not game: raise HTTPException(status_code=404, detail="Game not found")
        
        prediction = PredictionEngine.calculate_prediction(game_id, game["team_a"], game["team_b"])
        
        if supabase:
            supabase.table("predictions").insert({
                "game_id": game_id,
                "predicted_outcome": prediction.predicted_outcome,
                "confidence": prediction.confidence
            }).execute()
        
        return prediction
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/factors", response_model=List[Factor])
async def get_factors():
    try:
        if supabase:
            response = supabase.table("factors").select("*").execute()
            return response.data
        else:
            return DEMO_FACTORS
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
