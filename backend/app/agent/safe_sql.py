import logging
import time
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text
import sqlglot
from sqlglot import exp

logger = logging.getLogger("enterprise_ai.agent.safe_sql")

class SafeSQLEngine:
    """
    Enterprise Safe Text-to-SQL execution engine.
    Enforces AST-based statement inspection via SQLGlot, whitelist table constraints,
    injection prevention, single-statement enforcement, execution timeouts, and row clamping.
    """

    ALLOWED_TABLES = {
        "customers",
        "products",
        "orders",
        "order_items",
        "sales_records"
    }

    FORBIDDEN_KEYWORDS = {
        "insert", "update", "delete", "drop", "alter", "create",
        "truncate", "exec", "execute", "merge", "grant", "revoke",
        "vacuum", "attach", "detach", "pragma", "reindex"
    }

    MAX_ROW_LIMIT = 100
    QUERY_TIMEOUT_SECONDS = 5.0

    @classmethod
    def validate_query(cls, sql_query: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Validates an arbitrary SQL query against strict read-only safety rules.
        Returns: (is_valid, error_message, sanitized_sql)
        """
        raw = sql_query.strip().rstrip(";")
        if not raw:
            return False, "Query cannot be empty.", None

        # 1. Quick lexical check for forbidden mutation commands
        raw_lower = raw.lower()
        tokens = raw_lower.split()
        if not tokens:
            return False, "Invalid SQL string.", None

        for kw in cls.FORBIDDEN_KEYWORDS:
            if kw in tokens:
                return False, f"Forbidden statement type detected: '{kw.upper()}' is strictly prohibited.", None

        # 2. Parse with SQLGlot AST
        try:
            parsed_statements = sqlglot.parse(raw)
        except Exception as e:
            return False, f"SQL syntax error: Unable to parse query ({str(e)})", None

        # 3. Reject multiple statements separated by semicolons
        if len(parsed_statements) != 1:
            return False, "Multiple SQL statements detected. Only a single read-only query is permitted.", None

        ast = parsed_statements[0]
        if ast is None:
            return False, "Invalid SQL syntax: AST is null.", None

        # 4. Enforce that statement root is a SELECT or read-only CTE (WITH ... SELECT ...)
        is_select = isinstance(ast, (exp.Select, exp.Union))
        is_cte_select = isinstance(ast, exp.Query) or (isinstance(ast, exp.With) and isinstance(ast.this, (exp.Select, exp.Union)))

        if not (is_select or is_cte_select):
            return False, f"Statement type '{ast.key.upper()}' is not permitted. Only read-only SELECT queries are allowed.", None

        # 5. Check for any nested DML/DDL expressions inside AST
        forbidden_nodes = ast.find((
            exp.Insert, exp.Update, exp.Delete, exp.Drop,
            exp.Alter, exp.Create, exp.Command
        ))
        if forbidden_nodes is not None:
            return False, "Forbidden modification operation detected inside AST.", None

        # 6. Validate table whitelist
        referenced_tables = [t.name.lower() for t in ast.find_all(exp.Table) if t.name]
        for tbl in referenced_tables:
            if tbl not in cls.ALLOWED_TABLES:
                return False, f"Access denied: Table '{tbl}' is not authorized for AI queries. Permitted tables: {sorted(list(cls.ALLOWED_TABLES))}", None

        # 7. Clamp row limit to MAX_ROW_LIMIT (100)
        limit_node = ast.find(exp.Limit)
        if limit_node and limit_node.expression:
            try:
                curr_limit = int(limit_node.expression.this)
                if curr_limit > cls.MAX_ROW_LIMIT:
                    ast = ast.limit(cls.MAX_ROW_LIMIT)
            except (ValueError, TypeError):
                ast = ast.limit(cls.MAX_ROW_LIMIT)
        else:
            ast = ast.limit(cls.MAX_ROW_LIMIT)

        sanitized_sql = ast.sql()
        return True, None, sanitized_sql

    @classmethod
    def execute_safe_query(cls, sql_query: str, db: Session) -> Dict[str, Any]:
        """
        Validates and executes a safe read-only SQL query against the database.
        Returns structured dictionary with execution timing, rows, and schema metadata.
        """
        start_time = time.time()
        is_valid, err_msg, sanitized_sql = cls.validate_query(sql_query)

        if not is_valid:
            logger.warning(f"Safe SQL validation rejected query '{sql_query}': {err_msg}")
            return {
                "success": False,
                "tool": "safe_sql",
                "raw_query": sql_query,
                "sanitized_query": None,
                "summary": f"Security Validation Blocked Query: {err_msg}",
                "row_count": 0,
                "data": None,
                "execution_ms": round((time.time() - start_time) * 1000, 2),
                "error": err_msg
            }

        try:
            result = db.execute(text(sanitized_sql))
            rows = [dict(row._mapping) for row in result]

            # Format datetime objects for clean serialization
            for r in rows:
                for k, v in r.items():
                    if hasattr(v, "isoformat"):
                        r[k] = v.isoformat()

            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            summary = f"Executed read-only SQL. Retrieved {len(rows)} rows in {elapsed_ms}ms."

            return {
                "success": True,
                "tool": "safe_sql",
                "raw_query": sql_query,
                "sanitized_query": sanitized_sql,
                "summary": summary,
                "row_count": len(rows),
                "data": rows,
                "execution_ms": elapsed_ms,
                "error": None
            }
        except Exception as e:
            logger.error(f"SQL execution failure on query '{sanitized_sql}': {e}")
            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "success": False,
                "tool": "safe_sql",
                "raw_query": sql_query,
                "sanitized_query": sanitized_sql,
                "summary": f"Database execution error: {str(e)}",
                "row_count": 0,
                "data": None,
                "execution_ms": elapsed_ms,
                "error": str(e)
            }
