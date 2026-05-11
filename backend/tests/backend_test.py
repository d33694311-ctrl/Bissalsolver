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



# ---------- Community Health Q&A ----------
H2 = {"Authorization": "Bearer test_session_bissal_token_2"}
HEALTH = {"post_id": None, "anon_post_id": None, "comment_id": None}

def test_health_post_auth_required():
    r = requests.post(f"{BASE}/health/posts", json={"title": "x", "body": "y"})
    assert r.status_code == 401
    r2 = requests.get(f"{BASE}/health/posts")
    assert r2.status_code == 401

def test_health_create_named_post():
    r = requests.post(f"{BASE}/health/posts",
                      json={"title": "TEST_headache", "body": "frequent headaches", "anonymous": False},
                      headers=H)
    assert r.status_code == 200
    d = r.json()
    HEALTH["post_id"] = d["id"]
    assert d["title"] == "TEST_headache"
    assert d["author_name"] == "Test Bissal"
    assert d["anonymous"] is False
    assert d["comments_count"] == 0
    assert "id" in d and d["user_id"] == "test-user-bissal"

def test_health_create_anonymous_post():
    r = requests.post(f"{BASE}/health/posts",
                      json={"title": "TEST_anon", "body": "private question", "anonymous": True},
                      headers=H)
    assert r.status_code == 200
    d = r.json()
    assert d["author_name"] == "Anonymous"
    assert d["anonymous"] is True
    HEALTH["anon_post_id"] = d["id"]

def test_health_list_posts():
    r = requests.get(f"{BASE}/health/posts", headers=H)
    assert r.status_code == 200
    ids = [p["id"] for p in r.json()]
    assert HEALTH["post_id"] in ids and HEALTH["anon_post_id"] in ids

def test_health_comment_create_increments_count():
    pid = HEALTH["post_id"]
    r = requests.post(f"{BASE}/health/posts/{pid}/comments",
                      json={"body": "TEST_drink water", "anonymous": False}, headers=H2)
    assert r.status_code == 200
    d = r.json()
    assert d["body"] == "TEST_drink water"
    assert d["author_name"] == "Test Two" or d["author_name"]  # second user's stored name
    assert d["post_id"] == pid
    HEALTH["comment_id"] = d["id"]
    # Verify increment via GET list
    posts = requests.get(f"{BASE}/health/posts", headers=H).json()
    p = next(p for p in posts if p["id"] == pid)
    assert p["comments_count"] == 1

def test_health_comment_anonymous():
    pid = HEALTH["post_id"]
    r = requests.post(f"{BASE}/health/posts/{pid}/comments",
                      json={"body": "TEST_try yoga", "anonymous": True}, headers=H)
    assert r.status_code == 200
    assert r.json()["author_name"] == "Anonymous"

def test_health_list_comments():
    pid = HEALTH["post_id"]
    r = requests.get(f"{BASE}/health/posts/{pid}/comments", headers=H)
    assert r.status_code == 200
    arr = r.json()
    assert len(arr) >= 2
    assert any(c["id"] == HEALTH["comment_id"] for c in arr)

def test_health_comment_on_missing_post_404():
    r = requests.post(f"{BASE}/health/posts/does-not-exist-xyz/comments",
                      json={"body": "x"}, headers=H)
    assert r.status_code == 404

def test_health_delete_others_post_404():
    # H2 tries to delete H's post -> 404 (not yours)
    r = requests.delete(f"{BASE}/health/posts/{HEALTH['post_id']}", headers=H2)
    assert r.status_code == 404

def test_health_delete_own_comment_decrements():
    pid, cid = HEALTH["post_id"], HEALTH["comment_id"]
    r = requests.delete(f"{BASE}/health/posts/{pid}/comments/{cid}", headers=H2)
    assert r.status_code == 200
    posts = requests.get(f"{BASE}/health/posts", headers=H).json()
    p = next(p for p in posts if p["id"] == pid)
    # Was 2, deleted 1 -> 1
    assert p["comments_count"] == 1

def test_health_delete_post_cascades_comments():
    pid = HEALTH["post_id"]
    r = requests.delete(f"{BASE}/health/posts/{pid}", headers=H)
    assert r.status_code == 200
    # Comments should be cleared
    c = requests.get(f"{BASE}/health/posts/{pid}/comments", headers=H)
    assert c.status_code == 200 and c.json() == []
    # And post gone from list
    posts = requests.get(f"{BASE}/health/posts", headers=H).json()
    assert pid not in [p["id"] for p in posts]

def test_health_cleanup_anon_post():
    r = requests.delete(f"{BASE}/health/posts/{HEALTH['anon_post_id']}", headers=H)
    assert r.status_code == 200
