from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Cookie, Depends, Header
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from openpyxl import Workbook

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Bissal API")
api_router = APIRouter(prefix="/api")

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# ---------- Models ----------
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class SessionData(BaseModel):
    session_id: str

class WasteListing(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    material: str
    quantity: str
    location: str
    contact: str
    description: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WasteListingCreate(BaseModel):
    material: str
    quantity: str
    location: str
    contact: str
    description: str

class WaterLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str
    liters: float
    notes: Optional[str] = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WaterLogCreate(BaseModel):
    date: str
    liters: float
    notes: Optional[str] = ""

class TaxEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # income or expense
    category: str
    amount: float
    description: Optional[str] = ""
    date: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TaxEntryCreate(BaseModel):
    type: str
    category: str
    amount: float
    description: Optional[str] = ""
    date: str

class CurrencyCalcRequest(BaseModel):
    base: str
    target: str
    amount: float
    customs_pct: float = 0
    transport_cost: float = 0
    other_fees: float = 0

class JournalEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str
    mood: str  # happy, neutral, sad, anxious, calm
    note: str
    quote: Optional[str] = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class JournalEntryCreate(BaseModel):
    date: str
    mood: str
    note: str

class QuoteRequest(BaseModel):
    mood: str

class Skill(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    skill_name: str
    description: str
    location: str
    looking_for: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    rating_sum: float = 0
    rating_count: int = 0

class SkillCreate(BaseModel):
    skill_name: str
    description: str
    location: str
    looking_for: str

class SkillReview(BaseModel):
    rating: float  # 1-5
    comment: Optional[str] = ""

# ---------- Auth helpers ----------
async def get_current_user(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
) -> User:
    token = session_token
    if not token and authorization:
        if authorization.startswith("Bearer "):
            token = authorization[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    return User(**user_doc)


# ---------- Auth Routes ----------
@api_router.get("/")
async def root():
    return {"app": "Bissal — Problem Solver Hub", "status": "ok"}

@api_router.post("/auth/session")
async def auth_session(payload: SessionData, response: Response):
    async with httpx.AsyncClient() as c:
        r = await c.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": payload.session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    data = r.json()
    email = data["email"]
    name = data.get("name", email)
    picture = data.get("picture")
    session_token = data["session_token"]

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60,
    )
    return {"user_id": user_id, "email": email, "name": name, "picture": picture}

@api_router.get("/auth/me", response_model=User)
async def auth_me(user: User = Depends(get_current_user)):
    return user

@api_router.post("/auth/logout")
async def auth_logout(response: Response, session_token: Optional[str] = Cookie(None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/", samesite="none", secure=True)
    return {"ok": True}

# ---------- Waste Exchange ----------
@api_router.get("/waste/listings")
async def list_waste(q: Optional[str] = None, material: Optional[str] = None):
    query = {}
    if material and material != "all":
        query["material"] = material
    docs = await db.waste_listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    if q:
        ql = q.lower()
        docs = [d for d in docs if ql in d.get("description", "").lower()
                or ql in d.get("location", "").lower()
                or ql in d.get("material", "").lower()]
    for d in docs:
        if isinstance(d.get("created_at"), str):
            d["created_at"] = d["created_at"]
    return docs

@api_router.post("/waste/listings")
async def create_waste(payload: WasteListingCreate, user: User = Depends(get_current_user)):
    listing = WasteListing(
        user_id=user.user_id,
        user_name=user.name,
        **payload.model_dump(),
    )
    doc = listing.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.waste_listings.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/waste/listings/{listing_id}")
async def delete_waste(listing_id: str, user: User = Depends(get_current_user)):
    result = await db.waste_listings.delete_one({"id": listing_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}

# ---------- Water Tracker ----------
@api_router.get("/water/logs")
async def list_water(user: User = Depends(get_current_user)):
    docs = await db.water_logs.find({"user_id": user.user_id}, {"_id": 0}).sort("date", -1).to_list(500)
    return docs

@api_router.post("/water/logs")
async def create_water(payload: WaterLogCreate, user: User = Depends(get_current_user)):
    log = WaterLog(user_id=user.user_id, **payload.model_dump())
    doc = log.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.water_logs.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/water/logs/{log_id}")
async def delete_water(log_id: str, user: User = Depends(get_current_user)):
    await db.water_logs.delete_one({"id": log_id, "user_id": user.user_id})
    return {"ok": True}

@api_router.get("/water/export")
async def export_water(user: User = Depends(get_current_user)):
    docs = await db.water_logs.find({"user_id": user.user_id}, {"_id": 0}).sort("date", 1).to_list(1000)
    wb = Workbook()
    ws = wb.active
    ws.title = "Water Usage"
    ws.append(["Date", "Liters", "Notes"])
    for d in docs:
        ws.append([d.get("date"), d.get("liters"), d.get("notes", "")])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=water_usage.xlsx"},
    )

# ---------- Tax Helper ----------
@api_router.get("/tax/entries")
async def list_tax(user: User = Depends(get_current_user)):
    docs = await db.tax_entries.find({"user_id": user.user_id}, {"_id": 0}).sort("date", -1).to_list(1000)
    return docs

@api_router.post("/tax/entries")
async def create_tax(payload: TaxEntryCreate, user: User = Depends(get_current_user)):
    entry = TaxEntry(user_id=user.user_id, **payload.model_dump())
    doc = entry.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.tax_entries.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/tax/entries/{entry_id}")
async def delete_tax(entry_id: str, user: User = Depends(get_current_user)):
    await db.tax_entries.delete_one({"id": entry_id, "user_id": user.user_id})
    return {"ok": True}

@api_router.get("/tax/summary")
async def tax_summary(user: User = Depends(get_current_user)):
    docs = await db.tax_entries.find({"user_id": user.user_id}, {"_id": 0}).to_list(5000)
    income = sum(d["amount"] for d in docs if d["type"] == "income")
    expenses = sum(d["amount"] for d in docs if d["type"] == "expense")
    net = income - expenses
    # progressive bracket estimate
    if net <= 500000:
        tax = net * 0.01
    elif net <= 2000000:
        tax = 5000 + (net - 500000) * 0.10
    elif net <= 3000000:
        tax = 5000 + 150000 + (net - 2000000) * 0.20
    else:
        tax = 5000 + 150000 + 200000 + (net - 3000000) * 0.30
    tax = max(tax, 0)
    return {
        "income": income,
        "expenses": expenses,
        "net_profit": net,
        "estimated_tax": round(tax, 2),
        "entries": len(docs),
    }

@api_router.get("/tax/export/excel")
async def tax_export_excel(user: User = Depends(get_current_user)):
    docs = await db.tax_entries.find({"user_id": user.user_id}, {"_id": 0}).sort("date", 1).to_list(5000)
    wb = Workbook()
    ws = wb.active
    ws.title = "Tax Summary"
    ws.append(["Date", "Type", "Category", "Amount", "Description"])
    for d in docs:
        ws.append([d["date"], d["type"], d["category"], d["amount"], d.get("description", "")])
    income = sum(d["amount"] for d in docs if d["type"] == "income")
    expenses = sum(d["amount"] for d in docs if d["type"] == "expense")
    ws.append([])
    ws.append(["Total Income", income])
    ws.append(["Total Expenses", expenses])
    ws.append(["Net Profit", income - expenses])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=tax_summary.xlsx"},
    )

@api_router.get("/tax/export/pdf")
async def tax_export_pdf(user: User = Depends(get_current_user)):
    docs = await db.tax_entries.find({"user_id": user.user_id}, {"_id": 0}).sort("date", 1).to_list(5000)
    income = sum(d["amount"] for d in docs if d["type"] == "income")
    expenses = sum(d["amount"] for d in docs if d["type"] == "expense")
    net = income - expenses

    buf = io.BytesIO()
    doc_pdf = SimpleDocTemplate(buf, pagesize=letter)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name="Title", parent=styles["Heading1"], fontName="Courier-Bold", fontSize=18
    )
    elements = []
    elements.append(Paragraph("BISSAL — TAX SUMMARY", title_style))
    elements.append(Paragraph(f"Prepared for: {user.name} ({user.email})", styles["Normal"]))
    elements.append(Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}", styles["Normal"]))
    elements.append(Spacer(1, 12))

    data = [["Date", "Type", "Category", "Amount", "Description"]]
    for d in docs:
        data.append([d["date"], d["type"], d["category"], f"{d['amount']:.2f}", d.get("description", "")[:40]])
    if len(data) == 1:
        data.append(["—", "—", "—", "—", "No entries"])
    table = Table(data, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Courier"),
        ("FONTNAME", (0, 0), (-1, 0), "Courier-Bold"),
        ("BOX", (0, 0), (-1, -1), 1, colors.black),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 18))
    summary = [
        ["TOTAL INCOME", f"{income:.2f}"],
        ["TOTAL EXPENSES", f"{expenses:.2f}"],
        ["NET PROFIT", f"{net:.2f}"],
    ]
    s_table = Table(summary, hAlign="LEFT")
    s_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Courier-Bold"),
        ("BOX", (0, 0), (-1, -1), 1, colors.black),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
    ]))
    elements.append(s_table)
    doc_pdf.build(elements)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=tax_summary.pdf"},
    )

# ---------- Currency Converter ----------
@api_router.get("/currency/rates")
async def currency_rates(base: str = "USD"):
    base = base.upper()
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"https://open.er-api.com/v6/latest/{base}")
        if r.status_code == 200:
            data = r.json()
            if data.get("result") == "success":
                return {"base": base, "rates": data["rates"], "time": data.get("time_last_update_utc")}
    except Exception as e:
        logging.warning(f"Currency API failed: {e}")
    # fallback static rates
    return {"base": base, "rates": {"USD": 1, "EUR": 0.92, "INR": 83.2, "NPR": 133.5, "GBP": 0.78, "JPY": 156.0, "CNY": 7.24}, "time": "static"}

@api_router.post("/currency/calculate")
async def currency_calculate(payload: CurrencyCalcRequest):
    base = payload.base.upper()
    target = payload.target.upper()
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"https://open.er-api.com/v6/latest/{base}")
        data = r.json() if r.status_code == 200 else None
        rate = (data or {}).get("rates", {}).get(target)
    except Exception:
        rate = None
    if rate is None:
        static = {"USD": 1, "EUR": 0.92, "INR": 83.2, "NPR": 133.5, "GBP": 0.78, "JPY": 156.0, "CNY": 7.24}
        if base not in static or target not in static:
            raise HTTPException(status_code=400, detail="Unsupported currency")
        rate = static[target] / static[base]
    converted = payload.amount * rate
    customs = converted * (payload.customs_pct / 100)
    landed = converted + customs + payload.transport_cost + payload.other_fees
    return {
        "rate": rate,
        "converted": round(converted, 2),
        "customs": round(customs, 2),
        "transport_cost": payload.transport_cost,
        "other_fees": payload.other_fees,
        "landed_cost": round(landed, 2),
        "base": base,
        "target": target,
    }

# ---------- Mental Health Journal ----------
@api_router.get("/journal/entries")
async def list_journal(user: User = Depends(get_current_user)):
    docs = await db.journal_entries.find({"user_id": user.user_id}, {"_id": 0}).sort("date", -1).to_list(500)
    return docs

@api_router.post("/journal/entries")
async def create_journal(payload: JournalEntryCreate, user: User = Depends(get_current_user)):
    entry = JournalEntry(user_id=user.user_id, **payload.model_dump())
    # Generate quote via Claude
    quote = await _generate_quote(payload.mood, payload.note)
    entry.quote = quote
    doc = entry.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.journal_entries.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.post("/journal/quote")
async def generate_quote_only(payload: QuoteRequest):
    q = await _generate_quote(payload.mood, "")
    return {"quote": q}

async def _generate_quote(mood: str, note: str) -> str:
    if not EMERGENT_LLM_KEY:
        return "Every small step you take is a quiet revolution against yesterday."
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"quote-{uuid.uuid4().hex[:8]}",
            system_message=(
                "You are a calm, literary mental-wellness writer in the spirit of classic essayists. "
                "Given a user's mood and short note, respond with ONE original motivational quote, "
                "1-2 sentences, max 30 words, no quotation marks, no preamble. Tone: gentle, dignified, hopeful."
            ),
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        msg = UserMessage(text=f"Mood: {mood}. Note: {note or 'no extra notes'}.")
        reply = await chat.send_message(msg)
        return (reply or "").strip().strip('"').strip("'")
    except Exception as e:
        logging.warning(f"LLM failed: {e}")
        return "Every small step you take is a quiet revolution against yesterday."

@api_router.delete("/journal/entries/{entry_id}")
async def delete_journal(entry_id: str, user: User = Depends(get_current_user)):
    await db.journal_entries.delete_one({"id": entry_id, "user_id": user.user_id})
    return {"ok": True}

@api_router.get("/journal/export")
async def journal_export(user: User = Depends(get_current_user)):
    docs = await db.journal_entries.find({"user_id": user.user_id}, {"_id": 0}).sort("date", 1).to_list(1000)
    buf = io.BytesIO()
    pdf = SimpleDocTemplate(buf, pagesize=letter)
    styles = getSampleStyleSheet()
    body = ParagraphStyle(name="b", parent=styles["Normal"], fontName="Courier", fontSize=10, leading=14)
    title = ParagraphStyle(name="t", parent=styles["Heading1"], fontName="Courier-Bold", fontSize=18)
    quote_s = ParagraphStyle(name="q", parent=styles["Italic"], fontName="Courier-Oblique", fontSize=11, leading=15, leftIndent=20)
    elements = [Paragraph("BISSAL — JOURNAL ARCHIVE", title), Paragraph(f"{user.name}", body), Spacer(1, 18)]
    for d in docs:
        elements.append(Paragraph(f"{d['date']}  •  Mood: {d['mood'].upper()}", body))
        elements.append(Paragraph(d.get("note", ""), body))
        if d.get("quote"):
            elements.append(Paragraph(f"&mdash; {d['quote']}", quote_s))
        elements.append(Spacer(1, 12))
    if not docs:
        elements.append(Paragraph("No journal entries yet.", body))
    pdf.build(elements)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=journal.pdf"},
    )

# ---------- Community Health Help ----------
class HealthPostCreate(BaseModel):
    title: str
    body: str
    anonymous: bool = False

class HealthCommentCreate(BaseModel):
    body: str
    anonymous: bool = False

@api_router.get("/health/posts")
async def list_health_posts(user: User = Depends(get_current_user)):
    docs = await db.health_posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs

@api_router.post("/health/posts")
async def create_health_post(payload: HealthPostCreate, user: User = Depends(get_current_user)):
    post = {
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "author_name": "Anonymous" if payload.anonymous else user.name,
        "anonymous": payload.anonymous,
        "title": payload.title,
        "body": payload.body,
        "comments_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.health_posts.insert_one(post)
    post.pop("_id", None)
    return post

@api_router.delete("/health/posts/{post_id}")
async def delete_health_post(post_id: str, user: User = Depends(get_current_user)):
    res = await db.health_posts.delete_one({"id": post_id, "user_id": user.user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found or not yours")
    await db.health_comments.delete_many({"post_id": post_id})
    return {"ok": True}

@api_router.get("/health/posts/{post_id}/comments")
async def list_health_comments(post_id: str, user: User = Depends(get_current_user)):
    docs = await db.health_comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return docs

@api_router.post("/health/posts/{post_id}/comments")
async def create_health_comment(post_id: str, payload: HealthCommentCreate, user: User = Depends(get_current_user)):
    post = await db.health_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    comment = {
        "id": str(uuid.uuid4()),
        "post_id": post_id,
        "user_id": user.user_id,
        "author_name": "Anonymous" if payload.anonymous else user.name,
        "anonymous": payload.anonymous,
        "body": payload.body,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.health_comments.insert_one(comment)
    comment.pop("_id", None)
    await db.health_posts.update_one({"id": post_id}, {"$inc": {"comments_count": 1}})
    return comment

@api_router.delete("/health/posts/{post_id}/comments/{comment_id}")
async def delete_health_comment(post_id: str, comment_id: str, user: User = Depends(get_current_user)):
    res = await db.health_comments.delete_one({"id": comment_id, "user_id": user.user_id})
    if res.deleted_count:
        await db.health_posts.update_one({"id": post_id}, {"$inc": {"comments_count": -1}})
    return {"ok": True}



# ---------- Skill Swap ----------
@api_router.get("/skills")
async def list_skills(q: Optional[str] = None):
    docs = await db.skills.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    if q:
        ql = q.lower()
        docs = [d for d in docs if ql in d["skill_name"].lower() or ql in d.get("description", "").lower() or ql in d.get("location", "").lower()]
    return docs

@api_router.post("/skills")
async def create_skill(payload: SkillCreate, user: User = Depends(get_current_user)):
    skill = Skill(user_id=user.user_id, user_name=user.name, **payload.model_dump())
    doc = skill.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.skills.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/skills/{skill_id}")
async def delete_skill(skill_id: str, user: User = Depends(get_current_user)):
    await db.skills.delete_one({"id": skill_id, "user_id": user.user_id})
    return {"ok": True}

@api_router.post("/skills/{skill_id}/review")
async def review_skill(skill_id: str, review: SkillReview, user: User = Depends(get_current_user)):
    skill = await db.skills.find_one({"id": skill_id}, {"_id": 0})
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    await db.skill_reviews.insert_one({
        "id": str(uuid.uuid4()),
        "skill_id": skill_id,
        "reviewer_id": user.user_id,
        "reviewer_name": user.name,
        "rating": review.rating,
        "comment": review.comment,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    new_sum = skill.get("rating_sum", 0) + review.rating
    new_count = skill.get("rating_count", 0) + 1
    await db.skills.update_one({"id": skill_id}, {"$set": {"rating_sum": new_sum, "rating_count": new_count}})
    return {"ok": True, "new_avg": new_sum / new_count}

@api_router.get("/skills/{skill_id}/reviews")
async def get_reviews(skill_id: str):
    docs = await db.skill_reviews.find({"skill_id": skill_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs

# ---------- Mount ----------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
