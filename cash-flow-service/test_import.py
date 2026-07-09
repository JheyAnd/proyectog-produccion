import httpx
import os
import sys

# Get the first .xlsx file from storage/project_files/79af0de2-3684-48f6-8641-1c02b21831e7/
target_dir = "C:/Users/Jheyson/Documents/GitHub/Proyectog-restructuring/business-case-service/storage/project_files/79af0de2-3684-48f6-8641-1c02b21831e7"
try:
    files = [f for f in os.listdir(target_dir) if f.endswith('.xlsx')]
    if not files:
        print("No .xlsx files found in the project directory.")
        sys.exit(1)
    
    file_path = os.path.join(target_dir, files[0])
    print(f"Testing with file: {file_path}")
    
    with open(file_path, "rb") as f:
        files_dict = {'file': (files[0], f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        response = httpx.post(
            "http://127.0.0.1:8018/v2/projects/79af0de2-3684-48f6-8641-1c02b21831e7/cash-flow/import-excel",
            files=files_dict
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
