import hashlib
import random
from datetime import datetime, timedelta, timezone
import bcrypt
from sqlalchemy.orm import Session
from backend.app.models.user import User, UserRole
from backend.app.models.business import Customer, Product, Order, OrderItem, SalesRecord
from backend.app.models.rag import Document, DocumentChunk
from backend.app.models.approval import ApprovalRequest
from backend.app.models.audit import AuditLog
import logging

logger = logging.getLogger(__name__)

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def seed_database_if_empty(db: Session):
    # Check if database has users or products
    if db.query(User).first() is not None:
        logger.info("Database already seeded. Skipping initial seeding.")
        return

    logger.info("Empty database detected. Starting initial enterprise data seeding...")

    # 1. Seed Users
    admin_user = User(
        username="admin",
        email="admin@enterprise-ai.local",
        hashed_password=hash_password("admin123"),
        full_name="Enterprise Administrator",
        role=UserRole.ADMIN.value,
        is_active=True
    )
    analyst_user = User(
        username="analyst",
        email="analyst@enterprise-ai.local",
        hashed_password=hash_password("analyst123"),
        full_name="Operations Analyst",
        role=UserRole.ANALYST.value,
        is_active=True
    )
    viewer_user = User(
        username="viewer",
        email="viewer@enterprise-ai.local",
        hashed_password=hash_password("viewer123"),
        full_name="Executive Viewer",
        role=UserRole.VIEWER.value,
        is_active=True
    )
    db.add_all([admin_user, analyst_user, viewer_user])
    db.flush()

    # 2. Seed Products
    products_data = [
        ("SKU-CLD-001", "Enterprise Cloud Suite Pro", "Cloud Software", 12000.0, 3500.0, 500),
        ("SKU-CLD-002", "Cloud Infrastructure Essentials", "Cloud Software", 6500.0, 1800.0, 800),
        ("SKU-SEC-001", "AI Threat Sentinel Security", "Security Suite", 18500.0, 5000.0, 300),
        ("SKU-SEC-002", "Endpoint Zero-Trust Guard", "Security Suite", 9200.0, 2400.0, 450),
        ("SKU-SEC-003", "Data Loss Prevention Shield", "Security Suite", 11400.0, 3100.0, 400),
        ("SKU-DAT-001", "Real-Time BI & Analytics Hub", "Analytics Platform", 14500.0, 4200.0, 250),
        ("SKU-DAT-002", "Data Warehouse Connector", "Analytics Platform", 4800.0, 1100.0, 600),
        ("SKU-OPS-001", "Autonomous Workflow Automator", "Operations Software", 16000.0, 4600.0, 200),
        ("SKU-OPS-002", "Incident Response Dashboard", "Operations Software", 8500.0, 2200.0, 350),
        ("SKU-SUP-001", "24/7 Dedicated Support SLA", "Support Plan", 24000.0, 9000.0, 150),
        ("SKU-SUP-002", "Business Hours Support Tier", "Support Plan", 7500.0, 2500.0, 400),
        ("SKU-SRV-001", "Custom Architecture Consulting", "Professional Services", 35000.0, 16000.0, 50),
        ("SKU-SRV-002", "Security Audit & Hardening", "Professional Services", 28000.0, 12000.0, 75),
        ("SKU-HDW-001", "Edge AI Gateway Appliance X1", "Hardware", 8200.0, 4800.0, 120),
        ("SKU-HDW-002", "High-Availability Storage Rack", "Hardware", 22000.0, 14000.0, 60),
    ]

    products = []
    for sku, name, cat, unit_p, cost_p, stock in products_data:
        p = Product(
            sku=sku,
            name=name,
            category=cat,
            unit_price=unit_p,
            cost_price=cost_p,
            stock_quantity=stock,
            is_active=1
        )
        products.append(p)
    db.add_all(products)
    db.flush()

    # 3. Seed Customers
    regions = ["North America", "Europe", "Asia-Pacific", "LATAM"]
    companies = [
        ("Acme Global Tech", "alice.miller@acmeglobal.com", "Alice Miller", "North America", "Enterprise"),
        ("Nexus FinTech Group", "robert.chen@nexusfintech.com", "Robert Chen", "Asia-Pacific", "Enterprise"),
        ("Nordic Health Systems", "freja.jensen@nordichealth.se", "Freja Jensen", "Europe", "Enterprise"),
        ("Apex Logistics Inc", "carlos.santos@apexlogistics.com", "Carlos Santos", "LATAM", "Mid-Market"),
        ("Vertex AI Labs", "sarah.connor@vertexlabs.io", "Sarah Connor", "North America", "Mid-Market"),
        ("Starlight Media UK", "oliver.smith@starlightmedia.co.uk", "Oliver Smith", "Europe", "Mid-Market"),
        ("OmniRetail Global", "elena.rostova@omniretail.de", "Elena Rostova", "Europe", "Enterprise"),
        ("Pacific Dynamics", "kenji.sato@pacificdynamics.jp", "Kenji Sato", "Asia-Pacific", "Mid-Market"),
        ("Solaria Clean Energy", "mateo.morales@solariaenergy.cl", "Mateo Morales", "LATAM", "SMB"),
        ("Quantum BioMed", "dr.patel@quantumbiomed.com", "Dr. A. Patel", "North America", "Enterprise"),
        ("Cascade Industrial Automation", "mark.taylor@cascadeia.com", "Mark Taylor", "North America", "Mid-Market"),
        ("Bavarian Motors Cloud", "hans.gruber@bmcloud.de", "Hans Gruber", "Europe", "Enterprise"),
        ("Zenith Financial Advisory", "zoe.adams@zenithfa.com", "Zoe Adams", "North America", "SMB"),
        ("Atlas Marine Shipping", "george.costas@atlasmarine.gr", "George Costas", "Europe", "Mid-Market"),
        ("Vanguard Robotics", "liam.vance@vanguardrobotics.com", "Liam Vance", "North America", "Enterprise"),
    ]

    customers = []
    for comp, email, contact, reg, tier in companies:
        c = Customer(
            name=contact,
            email=email,
            company=comp,
            region=reg,
            tier=tier,
            status="Active"
        )
        customers.append(c)
    db.add_all(customers)
    db.flush()

    # 4. Seed Orders & Order Items
    random.seed(42)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    statuses = ["Completed", "Completed", "Completed", "Completed", "Refunded", "Pending"]
    payment_methods = ["Corporate Wire", "Credit Card", "ACH Transfer", "Net 30 Invoice"]

    order_count = 120
    for i in range(1, order_count + 1):
        days_ago = random.randint(0, 360)
        order_date = now - timedelta(days=days_ago, hours=random.randint(1, 23))
        cust = random.choice(customers)
        status = random.choice(statuses)
        pay_method = random.choice(payment_methods)

        ord_obj = Order(
            order_number=f"ORD-2026-{10000 + i}",
            customer_id=cust.id,
            order_date=order_date,
            status=status,
            total_amount=0.0,
            payment_method=pay_method
        )
        db.add(ord_obj)
        db.flush()  # Populates ord_obj.id

        chosen_products = random.sample(products, k=random.randint(1, 3))
        order_subtotal = 0.0

        for prod in chosen_products:
            qty = random.randint(1, 4)
            disc = random.choice([0.0, 0.0, 0.05, 0.10, 0.15])
            item_total = round(qty * prod.unit_price * (1.0 - disc), 2)
            order_subtotal += item_total

            item = OrderItem(
                order_id=ord_obj.id,
                product_id=prod.id,
                quantity=qty,
                unit_price=prod.unit_price,
                discount_percent=disc,
                subtotal=item_total
            )
            db.add(item)

        ord_obj.total_amount = round(order_subtotal, 2)

    db.flush()

    # 5. Seed Aggregated Sales Records
    sales_records = []
    for m in range(12, 0, -1):
        month_date = (now.replace(day=1) - timedelta(days=m * 30)).replace(day=15)
        for reg in regions:
            gross = round(random.uniform(120000.0, 380000.0), 2)
            net = round(gross * random.uniform(0.82, 0.91), 2)
            s_rec = SalesRecord(
                date=month_date,
                region=reg,
                channel=random.choice(["Direct Enterprise", "Partner Network", "Online Portal"]),
                gross_revenue=gross,
                net_revenue=net,
                order_count=random.randint(25, 80),
                customer_count=random.randint(15, 50)
            )
            sales_records.append(s_rec)
    db.add_all(sales_records)
    db.flush()

    # 6. Seed Sample Knowledge Base Documents (Refund Policy & SLA)
    doc_refund_text = """
ENTERPRISE AI OPERATIONS - REFUND AND CANCELLATION POLICY
Document ID: POL-FIN-2026-04
Effective Date: January 1, 2026

1. SCOPE AND ELIGIBILITY
This policy governs all refund, cancellation, and billing dispute requests for enterprise software subscriptions, cloud appliances, and support tiers.

2. SOFTWARE SUBSCRIPTIONS (Cloud Suite & Security)
Enterprise customers may cancel recurring subscription licenses within thirty (30) calendar days of the initial provisioning date for a full 100% refund. Cancellations requested after 30 days are non-refundable for the active billing term but prevent automatic renewal.

3. HARDWARE APPLIANCES (Edge AI Gateway & Storage)
Hardware products may be returned within forty-five (45) days of delivery provided they are in unopened or original working condition. A restocking fee of 10% applies unless hardware failure is certified by enterprise technical support.

4. PROFESSIONAL SERVICES AND ARCHITECTURE CONSULTING
Fees paid for custom consulting and security auditing engagements are refundable up to 72 hours prior to project kickoff. Once engagement delivery commences, billed hours are strictly non-refundable.

5. REFUND APPROVAL WORKFLOW
All refund requests exceeding $5,000 USD require explicit authorization from an Operations Manager or Finance Director. The AI Operations Agent will stage a formal approval request for administrative review before any credit or wire disbursement is executed.
"""

    doc_sla_text = """
ENTERPRISE SERVICE LEVEL AGREEMENT (SLA) AND SUPPORT TIERS
Document ID: SLA-OPS-2026-01
Classification: Confidential - Customer Facing

1. SUPPORT TIERS OVERVIEW
- 24/7 Dedicated Support SLA (SKU-SUP-001): 99.99% uptime guarantee, 15-minute response time for Severity-1 incidents, dedicated technical account manager.
- Business Hours Support Tier (SKU-SUP-002): 99.9% uptime guarantee, 2-hour response time during 8:00 AM - 6:00 PM EST, standard ticketing queue.

2. SEVERITY DEFINITIONS
- Severity 1 (Critical): Core production services offline, critical security breach, total data processing halt. Response SLA: 15 minutes.
- Severity 2 (High): Major feature degraded, failover operating without redundancy. Response SLA: 1 hour.
- Severity 3 (Medium): Minor bug, administrative dashboard glitch, non-blocking workflow inquiry. Response SLA: 4 hours.
- Severity 4 (Low): Feature request, general architectural guidance, documentation clarification. Response SLA: 1 business day.

3. DOWNTIME CREDITS
If monthly availability falls below 99.9%, customers are entitled to a 10% service credit. Below 99.0%, a 25% credit is issued upon verified ticket filing.
"""

    def split_and_create_doc(filename: str, desc: str, full_text: str):
        from backend.app.services.embeddings import embedding_service
        import json

        content_hash = hashlib.sha256(full_text.encode("utf-8")).hexdigest()
        doc = Document(
            filename=filename,
            file_type="txt",
            file_size_bytes=len(full_text.encode("utf-8")),
            content_hash=content_hash,
            chunk_count=0,
            uploaded_by="system",
            description=desc,
            status="indexed",
            embedding_model=embedding_service.active_model
        )
        db.add(doc)
        db.flush()

        paragraphs = [p.strip() for p in full_text.strip().split("\n\n") if p.strip()]
        embeddings = embedding_service.embed_batch(paragraphs)
        chunks = []
        for idx, (para, emb) in enumerate(zip(paragraphs, embeddings)):
            chunk = DocumentChunk(
                document_id=doc.id,
                chunk_index=idx,
                page_number=1,
                content=para,
                token_count=len(para.split()),
                embedding_json=json.dumps(emb)
            )
            chunks.append(chunk)
        doc.chunk_count = len(chunks)
        db.add_all(chunks)

    split_and_create_doc("Enterprise_Refund_Policy_2026.txt", "Standard enterprise refund, cancellation, and dispute guidelines", doc_refund_text)
    split_and_create_doc("Service_Level_Agreement_SLA_2026.txt", "Support response times, severity tiers, and uptime credits", doc_sla_text)

    # 7. Seed Sample Initial HITL Approval Request
    init_approval = ApprovalRequest(
        action_type="CREATE_SUPPORT_TICKET",
        title="Escalate Severity-1 Cloud Gateway Timeout Incident",
        description="Customer Nexus FinTech Group reported repeated gateway timeouts during peak transaction volume. Proposed action is to open an urgent high-priority ticket in the engineering triage board.",
        payload_json='{"customer_id": 2, "company": "Nexus FinTech Group", "priority": "Severity-1", "service": "Cloud Gateway", "category": "Network Timeout"}',
        status="PENDING",
        requested_by="AI_Agent",
        reviewed_by=None
    )
    db.add(init_approval)

    # 8. Seed Initial Audit Log
    init_audit = AuditLog(
        user_id="system",
        user_role="system",
        ip_address="127.0.0.1",
        endpoint="/system/bootstrap",
        action="DATABASE_SEED",
        resource_type="Database",
        resource_id="enterprise_ops",
        status_code=200,
        details_json='{"message": "Initial database bootstrap and synthetic enterprise data generation completed successfully."}'
    )
    db.add(init_audit)

    db.commit()
    logger.info("Enterprise database seeding completed successfully.")
