"""
ViolenceSense - Local Environment Health Check
===============================================
Validates all local services are running and accessible.
Run this before starting the application to ensure everything is working.
"""

import asyncio
import sys
import os
from pathlib import Path

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_header(text: str):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text.center(60)}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}\n")


def print_status(name: str, status: bool, details: str = ""):
    icon = f"{Colors.GREEN}✓{Colors.RESET}" if status else f"{Colors.RED}✗{Colors.RESET}"
    status_text = f"{Colors.GREEN}OK{Colors.RESET}" if status else f"{Colors.RED}FAILED{Colors.RESET}"
    print(f"  {icon} {name.ljust(25)} [{status_text}] {details}")


def print_warning(text: str):
    print(f"  {Colors.YELLOW}⚠ {text}{Colors.RESET}")


def print_info(text: str):
    print(f"  {Colors.BLUE}ℹ {text}{Colors.RESET}")


async def check_mongodb():
    """Check if local MongoDB is running."""
    try:
        import pymongo
        client = pymongo.MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=3000)
        client.admin.command('ping')
        
        # Check if ViolenceSense database exists
        db_list = client.list_database_names()
        has_db = 'ViolenceSense' in db_list
        
        client.close()
        return True, f"Database: {'ViolenceSense exists' if has_db else 'Ready (no data yet)'}"
    except ImportError:
        return False, "pymongo not installed"
    except Exception as e:
        return False, str(e)


async def check_postgresql():
    """Check if local PostgreSQL is running."""
    try:
        import asyncpg
        
        # Try to connect with URL-decoded password
        conn = await asyncpg.connect(
            host='localhost',
            port=5432,
            user='postgres',
            password='Sudhir@9099',
            database='violencesense',
            timeout=5
        )
        
        # Check tables exist
        tables = await conn.fetch(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        )
        table_count = len(tables)
        
        await conn.close()
        return True, f"{table_count} tables found"
    except ImportError:
        return False, "asyncpg not installed"
    except Exception as e:
        error_msg = str(e)
        if 'does not exist' in error_msg:
            return False, "Database 'violencesense' doesn't exist. Run: CREATE DATABASE violencesense;"
        return False, error_msg


def check_model_file():
    """Check if the violence model exists."""
    model_paths = [
        Path("./ml-service/models/violence_model_legacy.h5"),
        Path("../ml-service/models/violence_model_legacy.h5"),
    ]
    
    for path in model_paths:
        if path.exists():
            size_mb = path.stat().st_size / (1024 * 1024)
            return True, f"{path} ({size_mb:.1f} MB)"
    
    return False, "Model not found in expected locations"


def check_ml_service_venv():
    """Check if the ML service virtual environment exists with TensorFlow."""
    venv_paths = [
        Path("./ml-service/venv/Scripts/python.exe"),
        Path("../ml-service/venv/Scripts/python.exe"),
    ]
    
    for venv_path in venv_paths:
        if venv_path.exists():
            return True, f"venv found at {venv_path.parent.parent}"
    
    return False, "ML Service venv not found. Run: cd ml-service && python -m venv venv && venv\\Scripts\\pip install -r requirements.txt"


def check_tensorflow_gpu():
    """Check if TensorFlow can use GPU."""
    try:
        import tensorflow as tf
        gpus = tf.config.list_physical_devices('GPU')
        
        if gpus:
            return True, f"{len(gpus)} GPU(s) available: {[g.name for g in gpus]}"
        else:
            return False, "No GPU detected (will use CPU - slower)"
    except ImportError:
        return False, "TensorFlow not installed"
    except Exception as e:
        return False, str(e)


async def check_service_port(name: str, host: str, port: int):
    """Check if a service is responding on a port."""
    try:
        import aiohttp
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=3)) as session:
            async with session.get(f"http://{host}:{port}/health") as response:
                if response.status == 200:
                    return True, f"Responding at {host}:{port}"
                return True, f"Listening (status: {response.status})"
    except:
        pass
    
    # Try raw socket connection
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port),
            timeout=2
        )
        writer.close()
        await writer.wait_closed()
        return True, f"Port {port} is open"
    except:
        return False, f"Not responding on {host}:{port}"


def check_env_files():
    """Check for required .env files."""
    env_files = {
        "Backend": Path("./backend/.env"),
        "Frontend": Path("./frontend/.env.local"),
        "ML Service": Path("./ml-service/.env"),
        "RTSP Service": Path("./rtsp-service/.env"),
    }
    
    results = []
    for name, path in env_files.items():
        if path.exists():
            results.append((name, True, "Found"))
        else:
            results.append((name, False, "Missing"))
    
    return results


async def main():
    print_header("ViolenceSense Local Environment Check")
    
    # Change to project root
    if Path("./backend").exists():
        os.chdir(".")
    elif Path("../backend").exists():
        os.chdir("..")
    
    all_ok = True
    
    # 1. Check Environment Files
    print(f"{Colors.BOLD}Environment Files:{Colors.RESET}")
    for name, status, details in check_env_files():
        print_status(name, status, details)
        if not status:
            all_ok = False
    
    # 2. Check Model File
    print(f"\n{Colors.BOLD}ML Model:{Colors.RESET}")
    status, details = check_model_file()
    print_status("violence_model_legacy.h5", status, details)
    if not status:
        all_ok = False
    
    # 2b. Check ML Service Virtual Environment
    status, details = check_ml_service_venv()
    print_status("ML Service venv", status, details)
    if not status:
        all_ok = False
        print_warning("ML Service requires venv with TensorFlow!")
    
    # 3. Check GPU/TensorFlow
    print(f"\n{Colors.BOLD}GPU Support:{Colors.RESET}")
    status, details = check_tensorflow_gpu()
    print_status("TensorFlow GPU", status, details)
    if not status:
        print_warning("GPU acceleration not available - inference will be slower")
    
    # 4. Check Databases
    print(f"\n{Colors.BOLD}Databases:{Colors.RESET}")
    
    status, details = await check_mongodb()
    print_status("MongoDB (localhost:27017)", status, details)
    if not status:
        all_ok = False
        print_info("Start MongoDB: mongod --dbpath=\"C:\\data\\db\"")
    
    status, details = await check_postgresql()
    print_status("PostgreSQL (localhost:5432)", status, details)
    if not status:
        all_ok = False
        print_info("Ensure PostgreSQL is running and database exists")
    
    # 5. Check Services (only if they're expected to be running)
    print(f"\n{Colors.BOLD}Services (optional - may not be running):{Colors.RESET}")
    
    for name, port in [("Backend API", 5000), ("ML Service", 8000), ("RTSP Service", 8080), ("Frontend", 3000)]:
        status, details = await check_service_port(name, "localhost", port)
        print_status(name, status, details)
    
    # Summary
    print_header("Summary")
    
    if all_ok:
        print(f"{Colors.GREEN}{Colors.BOLD}All critical checks passed! Ready to start services.{Colors.RESET}")
        print(f"\n{Colors.BOLD}Start services with:{Colors.RESET}")
        print("  1. MongoDB:    mongod --dbpath=\"C:\\data\\db\"")
        print("  2. PostgreSQL: Already running as service")
        print("  3. Backend:    cd backend && npm run dev")
        print("  4. ML Service: cd ml-service && start.bat  (or venv\\Scripts\\python main.py)")
        print("  5. RTSP:       cd rtsp-service && python main.py")
        print("  6. Frontend:   cd frontend && npm run dev")
        print(f"\n{Colors.YELLOW}IMPORTANT: ML Service MUST use venv Python with TensorFlow!{Colors.RESET}")
    else:
        print(f"{Colors.RED}{Colors.BOLD}Some checks failed. Please fix the issues above.{Colors.RESET}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
