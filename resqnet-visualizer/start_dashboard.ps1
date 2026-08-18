Write-Host "Starting ResQNet Visualization Dashboard..." -ForegroundColor Cyan

# Start Backend
Write-Host "Starting FastAPI Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; `$env:PYTHONPATH=`"D:\Codeathon\resqnet-visualizer\backend`"; uv run --project `"D:\Codeathon\resqnet-module2`" python run_server.py"

# Start Frontend
Write-Host "Starting Next.js Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "Done! Frontend will be available at http://localhost:3000" -ForegroundColor Green
