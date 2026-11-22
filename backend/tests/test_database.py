from backend.app.models.user import User
from backend.app.models.business import Customer, Product, Order, OrderItem, SalesRecord
from backend.app.models.rag import Document, DocumentChunk
from backend.app.models.approval import ApprovalRequest

def test_seeded_users(db_session):
    users = db_session.query(User).all()
    assert len(users) >= 3
    usernames = [u.username for u in users]
    assert "admin" in usernames
    assert "analyst" in usernames
    assert "viewer" in usernames

def test_seeded_products(db_session):
    products = db_session.query(Product).all()
    assert len(products) >= 10
    categories = {p.category for p in products}
    assert "Cloud Software" in categories
    assert "Security Suite" in categories

def test_seeded_customers(db_session):
    customers = db_session.query(Customer).all()
    assert len(customers) >= 10
    regions = {c.region for c in customers}
    assert "North America" in regions
    assert "Europe" in regions

def test_seeded_orders(db_session):
    orders = db_session.query(Order).all()
    assert len(orders) >= 50
    order_items = db_session.query(OrderItem).all()
    assert len(order_items) >= 50

def test_seeded_documents(db_session):
    docs = db_session.query(Document).all()
    assert len(docs) >= 2
    chunks = db_session.query(DocumentChunk).all()
    assert len(chunks) >= 5

def test_seeded_approvals(db_session):
    approvals = db_session.query(ApprovalRequest).all()
    assert len(approvals) >= 1
    assert approvals[0].status == "PENDING"

