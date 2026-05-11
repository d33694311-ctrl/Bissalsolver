"""Bissal backend API tests"""
import os, io, pytest, requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://3d9fc8e5-b121-436b-b526-ad7f54355a14.preview.emergentagent.com").rstrip("/") + "/api"
TOKEN = "test_session_bissal_token"
H = {"Authorization": f"Bearer {TOKEN}"}


# ---------- Root & Auth ----------
def test_root():
    r = requests.get(f"{BASE}/")
    assert r.status_code == 200
    assert r.json().get("app", "").startswith("Bissal")

def test_auth_required_401():
    r = requests.get(f"{BASE}/auth/me")
    assert r.status_code == 401

def test_auth_me_with_bearer():
    r = requests.get(f"{BASE}/auth/me", headers=H)
    assert r.status_code == 200
    assert r.json()["email"] == "test.bissal@example.com"

def test_invalid_bearer():
    r = requests.get(f"{BASE}/auth/me", headers={"Authorization": "Bearer invalid_xxx"})
    assert r.status_code == 401


# ---------- Waste Exchange ----------
WASTE_ID = {"id": None}

def test_waste_create():
    payload = {"material": "plastic", "quantity": "5kg", "location": "Kathmandu",
               "contact": "test@x.com", "description": "TEST_waste clean PET bottles"}
    r = requests.post(f"{BASE}/waste/listings", json=payload, headers=H)
    assert r.status_code == 200
    d = r.json()
    assert d["material"] == "plastic" and d["user_id"]
    WASTE_ID["id"] = d["id"]

def test_waste_list_and_search():
    r = requests.get(f"{BASE}/waste/listings")
    assert r.status_code == 200 and isinstance(r.json(), list)
    r2 = requests.get(f"{BASE}/waste/listings", params={"q": "PET", "material": "plastic"})
    assert r2.status_code == 200
    assert any(WASTE_ID["id"] == d["id"] for d in r2.json())

def test_waste_delete():
    r = requests.delete(f"{BASE}/waste/listings/{WASTE_ID['id']}", headers=H)
    assert r.status_code == 200
    r2 = requests.delete(f"{BASE}/waste/listings/{WASTE_ID['id']}", headers=H)
    assert r2.status_code == 404


# ---------- Water Tracker ----------
WATER_ID = {"id": None}

def test_water_create_list():
    r = requests.post(f"{BASE}/water/logs", json={"date": "2026-01-15", "liters": 12.5, "notes": "TEST"}, headers=H)
    assert r.status_code == 200
    WATER_ID["id"] = r.json()["id"]
    r2 = requests.get(f"{BASE}/water/logs", headers=H)
    assert r2.status_code == 200
    assert any(d["id"] == WATER_ID["id"] for d in r2.json())

def test_water_export_xlsx():
    r = requests.get(f"{BASE}/water/export", headers=H)
    assert r.status_code == 200
    assert "spreadsheet" in r.headers.get("content-type", "")
    assert len(r.content) > 100

def test_water_delete():
    r = requests.delete(f"{BASE}/water/logs/{WATER_ID['id']}", headers=H)
    assert r.status_code == 200


# ---------- Tax Helper ----------
TAX_IDS = []

def test_tax_create_and_summary():
    for p in [{"type":"income","category":"sales","amount":100000,"description":"TEST","date":"2026-01-01"},
              {"type":"expense","category":"rent","amount":30000,"description":"TEST","date":"2026-01-02"}]:
        r = requests.post(f"{BASE}/tax/entries", json=p, headers=H)
        assert r.status_code == 200
        TAX_IDS.append(r.json()["id"])
    r = requests.get(f"{BASE}/tax/summary", headers=H)
    assert r.status_code == 200
    d = r.json()
    assert d["income"] >= 100000 and d["expenses"] >= 30000
    assert "net_profit" in d and "estimated_tax" in d

def test_tax_export_pdf_excel():
    r = requests.get(f"{BASE}/tax/export/pdf", headers=H)
    assert r.status_code == 200 and r.headers["content-type"] == "application/pdf"
    assert r.content[:4] == b"%PDF"
    r2 = requests.get(f"{BASE}/tax/export/excel", headers=H)
    assert r2.status_code == 200 and "spreadsheet" in r2.headers["content-type"]

def test_tax_delete_cleanup():
    for tid in TAX_IDS:
        requests.delete(f"{BASE}/tax/entries/{tid}", headers=H)


# ---------- Currency ----------
def test_currency_rates():
    r = requests.get(f"{BASE}/currency/rates", params={"base": "USD"})
    assert r.status_code == 200
    d = r.json()
    assert d["base"] == "USD" and "rates" in d and "EUR" in d["rates"]

def test_currency_calculate():
    r = requests.post(f"{BASE}/currency/calculate", json={
        "base": "USD", "target": "INR", "amount": 100, "customs_pct": 10,
        "transport_cost": 50, "other_fees": 20})
    assert r.status_code == 200
    d = r.json()
    for k in ("rate", "converted", "customs", "landed_cost"):
        assert k in d
    assert d["landed_cost"] > d["converted"]


# ---------- Mental Journal (Claude) ----------
JOURNAL_ID = {"id": None}

def test_journal_create_with_claude_quote():
    r = requests.post(f"{BASE}/journal/entries",
        json={"date":"2026-01-15","mood":"calm","note":"TEST feeling steady today"}, headers=H, timeout=30)
    assert r.status_code == 200
    d = r.json()
    JOURNAL_ID["id"] = d["id"]
    assert d["quote"] and len(d["quote"]) > 5

def test_journal_list_export():
    r = requests.get(f"{BASE}/journal/entries", headers=H)
    assert r.status_code == 200
    r2 = requests.get(f"{BASE}/journal/export", headers=H)
    assert r2.status_code == 200 and r2.content[:4] == b"%PDF"

def test_journal_delete():
    r = requests.delete(f"{BASE}/journal/entries/{JOURNAL_ID['id']}", headers=H)
    assert r.status_code == 200


# ---------- Skill Swap ----------
SKILL_ID = {"id": None}

def test_skill_create_and_search():
    r = requests.post(f"{BASE}/skills", json={
        "skill_name":"TEST_Yoga","description":"morning flow","location":"Pokhara","looking_for":"Cooking"
    }, headers=H)
    assert r.status_code == 200
    SKILL_ID["id"] = r.json()["id"]
    r2 = requests.get(f"{BASE}/skills", params={"q":"TEST_Yoga"})
    assert r2.status_code == 200 and any(s["id"]==SKILL_ID["id"] for s in r2.json())

def test_skill_review():
    r = requests.post(f"{BASE}/skills/{SKILL_ID['id']}/review",
        json={"rating":4.5,"comment":"TEST great"}, headers=H)
    assert r.status_code == 200 and r.json()["new_avg"] == 4.5
    r2 = requests.get(f"{BASE}/skills/{SKILL_ID['id']}/reviews")
    assert r2.status_code == 200 and len(r2.json()) >= 1

def test_skill_delete():
    r = requests.delete(f"{BASE}/skills/{SKILL_ID['id']}", headers=H)
    assert r.status_code == 200
