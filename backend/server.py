from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Cookie, Depends, Header, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
import uuid
import httpx
import requests
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
    # Notify the post owner (if not commenting on own post)
    if post["user_id"] != user.user_id:
        await _create_notification(
            user_id=post["user_id"],
            kind="health_reply",
            title="New suggestion on your post",
            message=f'{comment["author_name"]} replied to "{post["title"]}"',
            link="/dashboard/journal",
            ref_id=post_id,
        )
    return comment

@api_router.delete("/health/posts/{post_id}/comments/{comment_id}")
async def delete_health_comment(post_id: str, comment_id: str, user: User = Depends(get_current_user)):
    res = await db.health_comments.delete_one({"id": comment_id, "user_id": user.user_id})
    if res.deleted_count:
        await db.health_posts.update_one({"id": post_id}, {"$inc": {"comments_count": -1}})
    return {"ok": True}

# ---------- Notifications ----------
async def _create_notification(user_id: str, kind: str, title: str, message: str, link: str, ref_id: Optional[str] = None):
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "kind": kind,
        "title": title,
        "message": message,
        "link": link,
        "ref_id": ref_id,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

@api_router.get("/notifications")
async def list_notifications(user: User = Depends(get_current_user)):
    docs = await db.notifications.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    unread = await db.notifications.count_documents({"user_id": user.user_id, "read": False})
    return {"items": docs, "unread": unread}

@api_router.post("/notifications/{nid}/read")
async def mark_notification_read(nid: str, user: User = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user.user_id}, {"$set": {"read": True}})
    return {"ok": True}

@api_router.post("/notifications/read-all")
async def mark_all_read(user: User = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user.user_id, "read": False}, {"$set": {"read": True}})
    return {"ok": True}

# ---------- Revision: Summariser + Flashcards ----------
class RevisionRequest(BaseModel):
    title: Optional[str] = ""
    notes: str

@api_router.post("/revision/generate")
async def revision_generate(payload: RevisionRequest, user: User = Depends(get_current_user)):
    notes = payload.notes.strip()
    if len(notes) < 30:
        raise HTTPException(status_code=400, detail="Please paste at least 30 characters of notes.")
    summary = ""
    table = []
    flashcards = []
    if EMERGENT_LLM_KEY:
        try:
            import json as _json
            sys_msg = (
                "You are a study assistant. Given raw notes, produce STRICT JSON with this shape: "
                '{"summary": "<3-5 sentence summary>", '
                '"table": [{"topic":"...", "key_point":"...", "example_or_formula":"..."}, ...up to 10 rows], '
                '"flashcards": [{"q":"...", "a":"..."}, ...up to 12 items]}. '
                "Do not wrap in markdown fences. Output JSON only."
            )
            chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"rev-{uuid.uuid4().hex[:8]}", system_message=sys_msg).with_model("anthropic", "claude-sonnet-4-5-20250929")
            reply = await chat.send_message(UserMessage(text=notes))
            text = (reply or "").strip()
            if text.startswith("```"):
                text = text.strip("`")
                if text.lower().startswith("json"):
                    text = text[4:].strip()
            data = _json.loads(text)
            summary = data.get("summary", "")
            table = data.get("table", [])
            flashcards = data.get("flashcards", [])
        except Exception as e:
            logging.warning(f"Revision LLM failed: {e}")
    if not summary:
        # Fallback: simple chunking
        sentences = [s.strip() for s in notes.replace("\n", " ").split(".") if len(s.strip()) > 10][:6]
        summary = ". ".join(sentences[:4]) + ("." if sentences else "")
        table = [{"topic": f"Point {i+1}", "key_point": s, "example_or_formula": ""} for i, s in enumerate(sentences[:6])]
        flashcards = [{"q": f"What is point {i+1}?", "a": s} for i, s in enumerate(sentences[:6])]

    session = {
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "title": payload.title or "Revision session",
        "notes": notes[:4000],
        "summary": summary,
        "table": table,
        "flashcards": flashcards,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.revision_sessions.insert_one(session)
    session.pop("_id", None)
    return session

@api_router.get("/revision/sessions")
async def list_revision_sessions(user: User = Depends(get_current_user)):
    docs = await db.revision_sessions.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs

@api_router.delete("/revision/sessions/{sid}")
async def delete_revision_session(sid: str, user: User = Depends(get_current_user)):
    await db.revision_sessions.delete_one({"id": sid, "user_id": user.user_id})
    return {"ok": True}

@api_router.get("/revision/sessions/{sid}/pdf")
async def revision_pdf(sid: str, user: User = Depends(get_current_user)):
    doc = await db.revision_sessions.find_one({"id": sid, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    buf = io.BytesIO()
    pdf = SimpleDocTemplate(buf, pagesize=letter)
    styles = getSampleStyleSheet()
    title = ParagraphStyle(name="t", parent=styles["Heading1"], fontName="Courier-Bold", fontSize=18)
    h2 = ParagraphStyle(name="h2", parent=styles["Heading2"], fontName="Courier-Bold", fontSize=13)
    body = ParagraphStyle(name="b", parent=styles["Normal"], fontName="Courier", fontSize=10, leading=14)
    elements = [Paragraph(f"BISSAL — {doc['title'].upper()}", title), Spacer(1, 8), Paragraph("SUMMARY", h2), Paragraph(doc["summary"], body), Spacer(1, 14), Paragraph("REVISION TABLE", h2)]
    rows = [["Topic", "Key point", "Example / Formula"]]
    for r in doc.get("table", []):
        rows.append([r.get("topic", "")[:30], r.get("key_point", "")[:60], r.get("example_or_formula", "")[:40]])
    if len(rows) == 1:
        rows.append(["—", "—", "—"])
    t = Table(rows, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Courier"),
        ("FONTNAME", (0, 0), (-1, 0), "Courier-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 14))
    elements.append(Paragraph("FLASHCARDS", h2))
    for i, fc in enumerate(doc.get("flashcards", []), 1):
        elements.append(Paragraph(f"{i}. Q: {fc.get('q','')}", body))
        elements.append(Paragraph(f"   A: {fc.get('a','')}", body))
        elements.append(Spacer(1, 6))
    pdf.build(elements)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=revision_{sid[:6]}.pdf"})

# ---------- Amendment Tracker (live regulator feeds) ----------
import feedparser
from bs4 import BeautifulSoup

REG_SOURCES = {
    "RBI": {
        "kind": "rss",
        "url": "https://news.google.com/rss/search?q=%22Reserve+Bank+of+India%22+notification+OR+circular+OR+amendment&hl=en-IN&gl=IN&ceid=IN:en",
        "site": "https://www.rbi.org.in",
    },
    "SEBI": {
        "kind": "rss",
        "url": "https://www.sebi.gov.in/sebirss.xml",
        "site": "https://www.sebi.gov.in",
    },
    "GST": {
        "kind": "rss",
        "url": "https://news.google.com/rss/search?q=%22GST+Council%22+OR+%22CBIC%22+notification+OR+circular&hl=en-IN&gl=IN&ceid=IN:en",
        "site": "https://www.cbic.gov.in",
    },
    "Income Tax": {
        "kind": "rss",
        "url": "https://news.google.com/rss/search?q=%22Income+Tax%22+India+notification+OR+circular+OR+amendment&hl=en-IN&gl=IN&ceid=IN:en",
        "site": "https://incometaxindia.gov.in",
    },
    "MCA": {
        "kind": "rss",
        "url": "https://news.google.com/rss/search?q=%22Ministry+of+Corporate+Affairs%22+notification+OR+amendment&hl=en-IN&gl=IN&ceid=IN:en",
        "site": "https://www.mca.gov.in",
    },
    "ICAI": {
        "kind": "rss",
        "url": "https://news.google.com/rss/search?q=ICAI+announcement+OR+amendment+OR+notification&hl=en-IN&gl=IN&ceid=IN:en",
        "site": "https://www.icai.org",
    },
}

_amend_cache = {"data": None, "ts": None}

async def _fetch_rss(name: str, src: dict) -> list:
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0 BissalBot"}) as c:
            r = await c.get(src["url"])
        if r.status_code != 200:
            return []
        parsed = feedparser.parse(r.text)
        items = []
        for e in parsed.entries[:8]:
            items.append({
                "source": name,
                "title": e.get("title", "")[:200],
                "summary": BeautifulSoup(e.get("summary", ""), "html.parser").get_text()[:280] if e.get("summary") else "",
                "link": e.get("link", src["site"]),
                "published": e.get("published", e.get("updated", "")),
            })
        return items
    except Exception as ex:
        logging.warning(f"RSS {name} failed: {ex}")
        return []

async def _fetch_scrape(name: str, src: dict) -> list:
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0 BissalBot"}) as c:
            r = await c.get(src["url"])
        if r.status_code != 200:
            return []
        soup = BeautifulSoup(r.text, "html.parser")
        items = []
        # Grab the first 8 <a> tags inside main content that look like notifications
        for a in soup.find_all("a", href=True)[:200]:
            text = a.get_text(" ", strip=True)
            href = a["href"]
            if len(text) < 25 or len(text) > 220:
                continue
            tlow = text.lower()
            if not any(k in tlow for k in ["notification", "circular", "amend", "rule", "act", "order", "press", "release", "announce", "advisory", "instruct"]):
                continue
            if href.startswith("/"):
                href = src["site"].rstrip("/") + href
            elif not href.startswith("http"):
                continue
            items.append({"source": name, "title": text[:200], "summary": "", "link": href, "published": ""})
            if len(items) >= 8:
                break
        return items
    except Exception as ex:
        logging.warning(f"Scrape {name} failed: {ex}")
        return []

@api_router.get("/amendments")
async def get_amendments(source: Optional[str] = None, q: Optional[str] = None, force: bool = False):
    now = datetime.now(timezone.utc)
    if not force and _amend_cache["ts"] and (now - _amend_cache["ts"]).total_seconds() < 1800 and _amend_cache["data"]:
        all_items = _amend_cache["data"]
    else:
        all_items = []
        for name, src in REG_SOURCES.items():
            if src["kind"] == "rss":
                all_items.extend(await _fetch_rss(name, src))
            else:
                all_items.extend(await _fetch_scrape(name, src))
        _amend_cache["data"] = all_items
        _amend_cache["ts"] = now
    items = all_items
    if source and source != "all":
        items = [i for i in items if i["source"].lower() == source.lower()]
    if q:
        ql = q.lower()
        items = [i for i in items if ql in i["title"].lower() or ql in i.get("summary", "").lower()]
    return {"items": items, "sources": list(REG_SOURCES.keys()), "cached_at": (_amend_cache["ts"].isoformat() if _amend_cache["ts"] else None)}

# ---------- Medicine Finder ----------
SEED_MEDICINES = [
    {"name": "Paracetamol 500mg", "generic": "Acetaminophen", "conditions": ["fever", "headache", "pain", "cold"], "alternatives": ["Crocin", "Calpol", "Dolo 650"], "avg_price": 25, "unit": "10 tabs"},
    {"name": "Ibuprofen 400mg", "generic": "Ibuprofen", "conditions": ["pain", "inflammation", "fever", "body ache"], "alternatives": ["Brufen", "Combiflam"], "avg_price": 35, "unit": "10 tabs"},
    {"name": "Amoxicillin 500mg", "generic": "Amoxicillin", "conditions": ["bacterial infection", "throat infection", "ear infection"], "alternatives": ["Mox 500", "Amoxil"], "avg_price": 110, "unit": "10 caps"},
    {"name": "Cetirizine 10mg", "generic": "Cetirizine", "conditions": ["allergy", "runny nose", "itching", "sneezing"], "alternatives": ["Cetzine", "Alerid", "Zyrtec"], "avg_price": 18, "unit": "10 tabs"},
    {"name": "Omeprazole 20mg", "generic": "Omeprazole", "conditions": ["acidity", "heartburn", "ulcer", "gastritis"], "alternatives": ["Omez", "Prilosec"], "avg_price": 55, "unit": "10 caps"},
    {"name": "Metformin 500mg", "generic": "Metformin", "conditions": ["diabetes", "type 2 diabetes", "blood sugar"], "alternatives": ["Glycomet", "Glucophage"], "avg_price": 32, "unit": "10 tabs"},
    {"name": "Atorvastatin 10mg", "generic": "Atorvastatin", "conditions": ["high cholesterol", "heart disease prevention"], "alternatives": ["Atorva", "Lipitor"], "avg_price": 85, "unit": "10 tabs"},
    {"name": "Amlodipine 5mg", "generic": "Amlodipine", "conditions": ["high blood pressure", "hypertension", "angina"], "alternatives": ["Amlong", "Stamlo"], "avg_price": 45, "unit": "10 tabs"},
    {"name": "Salbutamol Inhaler", "generic": "Salbutamol", "conditions": ["asthma", "wheezing", "breathlessness"], "alternatives": ["Asthalin", "Ventolin"], "avg_price": 165, "unit": "inhaler"},
    {"name": "Loperamide 2mg", "generic": "Loperamide", "conditions": ["diarrhea", "loose motion"], "alternatives": ["Imodium", "Lopamide"], "avg_price": 22, "unit": "10 caps"},
    {"name": "Pantoprazole 40mg", "generic": "Pantoprazole", "conditions": ["acidity", "GERD", "ulcer"], "alternatives": ["Pan 40", "Pantocid"], "avg_price": 78, "unit": "10 tabs"},
    {"name": "Azithromycin 500mg", "generic": "Azithromycin", "conditions": ["bacterial infection", "throat infection", "skin infection"], "alternatives": ["Azee", "Zithromax"], "avg_price": 130, "unit": "3 tabs"},
    {"name": "Diclofenac 50mg", "generic": "Diclofenac", "conditions": ["pain", "arthritis", "inflammation", "back pain"], "alternatives": ["Voveran", "Diclomol"], "avg_price": 28, "unit": "10 tabs"},
    {"name": "Levothyroxine 50mcg", "generic": "Levothyroxine", "conditions": ["thyroid", "hypothyroidism"], "alternatives": ["Thyronorm", "Eltroxin"], "avg_price": 95, "unit": "30 tabs"},
    {"name": "Multivitamin Tablet", "generic": "Multivitamin", "conditions": ["weakness", "fatigue", "vitamin deficiency", "nutrition"], "alternatives": ["Revital", "Becosules", "Supradyn"], "avg_price": 140, "unit": "30 tabs"},
    {"name": "ORS Sachet", "generic": "Oral Rehydration Salts", "conditions": ["dehydration", "diarrhea", "vomiting"], "alternatives": ["Electral", "Walyte"], "avg_price": 22, "unit": "sachet"},
    {"name": "Ranitidine 150mg", "generic": "Ranitidine", "conditions": ["acidity", "heartburn"], "alternatives": ["Rantac", "Aciloc"], "avg_price": 40, "unit": "10 tabs"},
    {"name": "Vitamin D3 60K", "generic": "Cholecalciferol", "conditions": ["vitamin d deficiency", "bone pain", "weakness"], "alternatives": ["Calcirol", "Uprise D3"], "avg_price": 45, "unit": "4 sachets"},
    {"name": "Aspirin 75mg", "generic": "Aspirin", "conditions": ["heart attack prevention", "blood thinner", "pain"], "alternatives": ["Ecosprin", "Disprin"], "avg_price": 12, "unit": "10 tabs"},
    {"name": "Montelukast 10mg", "generic": "Montelukast", "conditions": ["asthma", "allergy", "allergic rhinitis"], "alternatives": ["Montair", "Singulair"], "avg_price": 165, "unit": "10 tabs"},
]

async def _ensure_medicine_seed():
    count = await db.medicines.count_documents({})
    if count == 0:
        docs = []
        for m in SEED_MEDICINES:
            d = {"id": str(uuid.uuid4()), **m, "added_by": "system", "created_at": datetime.now(timezone.utc).isoformat()}
            docs.append(d)
        if docs:
            await db.medicines.insert_many(docs)

@app.on_event("startup")
async def on_startup():
    await _ensure_medicine_seed()
    try:
        init_storage()
        logging.info("Object storage initialised")
    except Exception as e:
        logging.warning(f"Storage init failed at startup (will retry on first upload): {e}")

@api_router.get("/medicines/search")
async def search_medicines(q: Optional[str] = ""):
    q = (q or "").strip().lower()
    cursor = db.medicines.find({}, {"_id": 0})
    docs = await cursor.to_list(1000)
    if q:
        def match(m):
            hay = " ".join([
                m.get("name", ""), m.get("generic", ""),
                " ".join(m.get("conditions", []) or []),
                " ".join(m.get("alternatives", []) or []),
            ]).lower()
            return q in hay
        docs = [m for m in docs if match(m)]
    docs.sort(key=lambda m: m.get("avg_price", 0))
    return docs[:30]

class MedicineCreate(BaseModel):
    name: str
    generic: Optional[str] = ""
    conditions: List[str] = []
    alternatives: List[str] = []
    avg_price: float
    unit: Optional[str] = ""

@api_router.post("/medicines")
async def add_medicine(payload: MedicineCreate, user: User = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "generic": payload.generic,
        "conditions": payload.conditions,
        "alternatives": payload.alternatives,
        "avg_price": payload.avg_price,
        "unit": payload.unit,
        "added_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.medicines.insert_one(doc)
    doc.pop("_id", None)
    return doc

# ---------- Weather Hub ----------
@api_router.get("/weather/geocode")
async def weather_geocode(q: str):
    try:
        async with httpx.AsyncClient(timeout=8) as c:
            r = await c.get(f"https://geocoding-api.open-meteo.com/v1/search?name={q}&count=5&language=en&format=json")
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        logging.warning(f"Geocode failed: {e}")
    return {"results": []}

@api_router.get("/weather/forecast")
async def weather_forecast(lat: float, lon: float):
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code,apparent_temperature",
                    "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
                    "timezone": "auto",
                    "forecast_days": 7,
                },
            )
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        logging.warning(f"Forecast failed: {e}")
    raise HTTPException(status_code=502, detail="Weather service unavailable")



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

# ---------- Mount (kept here until all routes are declared above) ----------

# ---------- Object Storage Helpers (Emergent) ----------
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "bissal"
_storage_key: Optional[str] = None

def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_LLM_KEY:
        raise RuntimeError("EMERGENT_LLM_KEY missing")
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=300,
    )
    if resp.status_code == 403:
        # Refresh storage key
        global _storage_key
        _storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=300,
        )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=120,
    )
    if resp.status_code == 403:
        global _storage_key
        _storage_key = None
        key = init_storage()
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key}, timeout=120,
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ---------- Educational Blog ----------
class BlogMedia(BaseModel):
    kind: str  # image | video
    path: str  # storage_path
    content_type: str
    original_filename: str

class BlogPostCreate(BaseModel):
    title: str
    body: str
    topic: Optional[str] = ""
    video_url: Optional[str] = ""  # external embed (YouTube/Vimeo)
    media: List[BlogMedia] = []

@api_router.post("/blog/upload")
async def blog_upload(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    name = file.filename or "file.bin"
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else "bin"
    ct = file.content_type or "application/octet-stream"
    kind = "image" if ct.startswith("image/") else ("video" if ct.startswith("video/") else "file")
    path = f"{APP_NAME}/blog/{user.user_id}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    try:
        result = put_object(path, data, ct)
    except Exception as e:
        logging.warning(f"Upload failed: {e}")
        raise HTTPException(status_code=502, detail="Upload failed. Try again.")
    await db.blog_files.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "storage_path": result["path"],
        "original_filename": name,
        "content_type": ct,
        "size": result.get("size", len(data)),
        "kind": kind,
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"path": result["path"], "kind": kind, "content_type": ct, "original_filename": name}

@api_router.get("/blog/file")
async def blog_file(path: str, session_token: Optional[str] = Cookie(None), auth: Optional[str] = Query(None)):
    token = session_token or auth
    if not token:
        raise HTTPException(status_code=401, detail="auth required")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="invalid session")
    record = await db.blog_files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="not found")
    try:
        data, ctype = get_object(path)
    except Exception as e:
        logging.warning(f"Download failed: {e}")
        raise HTTPException(status_code=502, detail="storage error")
    return Response(content=data, media_type=record.get("content_type") or ctype)

@api_router.get("/blog/posts")
async def list_blog(q: Optional[str] = None, topic: Optional[str] = None, user: User = Depends(get_current_user)):
    query = {}
    if topic and topic != "all":
        query["topic"] = topic
    docs = await db.blog_posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    if q:
        ql = q.lower()
        docs = [d for d in docs if ql in d.get("title", "").lower() or ql in d.get("body", "").lower() or ql in d.get("topic", "").lower()]
    return docs

@api_router.post("/blog/posts")
async def create_blog(payload: BlogPostCreate, user: User = Depends(get_current_user)):
    if not payload.title.strip() or not payload.body.strip():
        raise HTTPException(status_code=400, detail="Title and body are required.")
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "author_name": user.name,
        "author_picture": user.picture,
        "title": payload.title.strip(),
        "body": payload.body,
        "topic": (payload.topic or "general").strip().lower(),
        "video_url": payload.video_url or "",
        "media": [m.model_dump() for m in payload.media],
        "summary": "",
        "likes": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.blog_posts.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/blog/posts/{post_id}")
async def delete_blog(post_id: str, user: User = Depends(get_current_user)):
    post = await db.blog_posts.find_one({"id": post_id, "user_id": user.user_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="not found or not yours")
    await db.blog_posts.delete_one({"id": post_id})
    # Soft-delete attached media records
    for m in post.get("media", []):
        await db.blog_files.update_one({"storage_path": m.get("path")}, {"$set": {"is_deleted": True}})
    return {"ok": True}

@api_router.post("/blog/posts/{post_id}/summarise")
async def summarise_blog(post_id: str, user: User = Depends(get_current_user)):
    post = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="not found")
    summary = ""
    if EMERGENT_LLM_KEY:
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"blogsum-{uuid.uuid4().hex[:8]}",
                system_message=(
                    "You are a sharp editor. Summarise the user's educational blog post in EXACTLY 3 crisp bullet points, "
                    "each under 22 words. Output ONLY the bullets, each starting with '• '. No preamble, no headings."
                ),
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            text = f"Title: {post['title']}\nTopic: {post.get('topic','')}\n\n{post['body'][:6000]}"
            reply = await chat.send_message(UserMessage(text=text))
            summary = (reply or "").strip()
        except Exception as e:
            logging.warning(f"Blog summary failed: {e}")
    if not summary:
        # fallback: first 3 long sentences
        parts = [p.strip() for p in post["body"].replace("\n", " ").split(".") if len(p.strip()) > 15][:3]
        summary = "\n".join(f"• {p}." for p in parts) or "• Educational post by " + post.get("author_name", "")
    await db.blog_posts.update_one({"id": post_id}, {"$set": {"summary": summary}})
    return {"summary": summary}

@api_router.post("/blog/posts/{post_id}/like")
async def like_blog(post_id: str, user: User = Depends(get_current_user)):
    existing = await db.blog_likes.find_one({"post_id": post_id, "user_id": user.user_id})
    if existing:
        await db.blog_likes.delete_one({"post_id": post_id, "user_id": user.user_id})
        await db.blog_posts.update_one({"id": post_id}, {"$inc": {"likes": -1}})
        return {"liked": False}
    await db.blog_likes.insert_one({"post_id": post_id, "user_id": user.user_id, "created_at": datetime.now(timezone.utc).isoformat()})
    await db.blog_posts.update_one({"id": post_id}, {"$inc": {"likes": 1}})
    return {"liked": True}

# ---------- Mount router & middleware (must be after ALL routes) ----------
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
